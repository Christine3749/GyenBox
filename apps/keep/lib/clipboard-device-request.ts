import {
  CLIPBOARD_DEVICE_ID,
  CLIPBOARD_DEVICE_NAME_MAX_LENGTH,
  type ClipboardOrigin,
} from "./notes-data";

const DEVICE_ID_HEADER = "x-gy-device-id";
const DEVICE_NAME_HEADER = "x-gy-device-name";

export type ClipboardOriginHeader =
  | { origin?: ClipboardOrigin }
  | { error: string };

// Device identity is deliberately optional for v1-v3 clients. Once a native
// client sends it, both text and image commits carry the exact same identity
// through the ACK/event log without relying on a browser cookie or hostname.
export function readClipboardOrigin(request: Request): ClipboardOriginHeader {
  const rawId = request.headers.get(DEVICE_ID_HEADER)?.trim();
  if (!rawId) return {};
  if (!CLIPBOARD_DEVICE_ID.test(rawId))
    return { error: "Device ID is invalid." };

  const rawName = request.headers.get(DEVICE_NAME_HEADER);
  const name = rawName?.trim();
  if (
    name !== undefined &&
    (name.length === 0 || name.length > CLIPBOARD_DEVICE_NAME_MAX_LENGTH)
  ) {
    return { error: "Device name is invalid." };
  }
  return {
    origin: { deviceId: rawId, ...(name ? { displayName: name } : {}) },
  };
}
