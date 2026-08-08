import { fail, ok } from "@/lib/api-response";
import {
  CLIPBOARD_DEVICE_COLORS,
  CLIPBOARD_DEVICE_ID,
  CLIPBOARD_DEVICE_NAME_MAX_LENGTH,
  listClipboardDevices,
  registerClipboardDevice,
  type ClipboardDeviceColor,
} from "@/lib/notes-data";
import { requireActor } from "@/lib/ownership";

export const runtime = "nodejs";

type DeviceRequest = {
  id?: unknown;
  name?: unknown;
  color?: unknown;
};

type ParsedDevice =
  | { input: { id: string; name?: string; color?: ClipboardDeviceColor } }
  | { error: string };

function parseDevice(body: DeviceRequest, allowColor: boolean): ParsedDevice {
  if (typeof body.id !== "string" || !CLIPBOARD_DEVICE_ID.test(body.id))
    return { error: "Device ID is invalid." } as const;
  const name =
    body.name === undefined
      ? undefined
      : typeof body.name === "string"
        ? body.name.trim()
        : null;
  if (
    name === null ||
    (name !== undefined &&
      (name.length === 0 || name.length > CLIPBOARD_DEVICE_NAME_MAX_LENGTH))
  ) {
    return { error: "Device name is invalid." } as const;
  }
  const color =
    body.color === undefined
      ? undefined
      : typeof body.color === "string"
        ? body.color
        : null;
  if (!allowColor && color !== undefined)
    return {
      error: "Device color cannot be set during registration.",
    } as const;
  if (
    color !== undefined &&
    (!color || !CLIPBOARD_DEVICE_COLORS.includes(color as ClipboardDeviceColor))
  ) {
    return { error: "Device color is invalid." } as const;
  }
  return {
    input: {
      id: body.id,
      ...(name ? { name } : {}),
      ...(color ? { color: color as ClipboardDeviceColor } : {}),
    },
  } as const;
}

export async function GET(request: Request) {
  const actor = await requireActor(request);
  if (!actor.ok) return actor.response;
  try {
    return ok({ devices: await listClipboardDevices(actor) });
  } catch (error) {
    return fail(
      "CLIPBOARD_DEVICES_UNAVAILABLE",
      "Could not load clipboard devices.",
      503,
      {
        message: error instanceof Error ? error.message : "Unknown error",
      },
    );
  }
}

// Registration is idempotent. A native client may safely repeat it whenever it
// refreshes its token or reconnects after being offline.
export async function POST(request: Request) {
  const actor = await requireActor(request);
  if (!actor.ok) return actor.response;
  const body = (await request.json().catch(() => null)) as DeviceRequest | null;
  if (!body) return fail("INVALID_DEVICE", "Expected a device object.", 400);
  const parsed = parseDevice(body, false);
  if (!("input" in parsed)) return fail("INVALID_DEVICE", parsed.error, 400);
  try {
    return ok(
      { device: await registerClipboardDevice(actor, parsed.input) },
      201,
    );
  } catch (error) {
    return fail(
      "CLIPBOARD_DEVICE_REGISTER_FAILED",
      "Could not register clipboard device.",
      503,
      {
        message: error instanceof Error ? error.message : "Unknown error",
      },
    );
  }
}

// A deliberate user choice may rename a device or change its persisted colour.
// Other clients see the same value via GET and never invent a local mapping.
export async function PATCH(request: Request) {
  const actor = await requireActor(request);
  if (!actor.ok) return actor.response;
  const body = (await request.json().catch(() => null)) as DeviceRequest | null;
  if (!body) return fail("INVALID_DEVICE", "Expected a device object.", 400);
  const parsed = parseDevice(body, true);
  if (!("input" in parsed)) return fail("INVALID_DEVICE", parsed.error, 400);
  try {
    return ok({ device: await registerClipboardDevice(actor, parsed.input) });
  } catch (error) {
    return fail(
      "CLIPBOARD_DEVICE_UPDATE_FAILED",
      "Could not update clipboard device.",
      503,
      {
        message: error instanceof Error ? error.message : "Unknown error",
      },
    );
  }
}
