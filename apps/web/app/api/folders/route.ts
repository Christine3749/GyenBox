import { fail, ok } from "@/lib/api-response";
import { ensureUserRecord, folderToItem } from "@/lib/file-records";
import { requireActor } from "@/lib/ownership";
import { getPrisma } from "@/lib/prisma";
import { folderCreateSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const actor = await requireActor(request);
  if (!actor.ok) return actor.response;

  const folders = await getPrisma().folder.findMany({
    where: { ownerId: actor.actorId, isTrashed: false },
    include: {
      owner: { select: { email: true, name: true, avatarUrl: true } },
    },
    orderBy: { name: "asc" },
  });

  return ok({
    folders: folders.map((folder) => folderToItem(folder, 0)),
  });
}

export async function POST(request: Request) {
  const actor = await requireActor(request);
  if (!actor.ok) return actor.response;

  const body = await request.json().catch(() => null);
  const parsed = folderCreateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(
      "VALIDATION_ERROR",
      "Invalid folder payload.",
      422,
      parsed.error.flatten(),
    );
  }

  await ensureUserRecord(actor);
  const prisma = getPrisma();
  const parentId =
    parsed.data.parentId && parsed.data.parentId !== "root"
      ? parsed.data.parentId
      : null;

  if (parentId) {
    const parent = await prisma.folder.findFirst({
      where: { id: parentId, ownerId: actor.actorId, isTrashed: false },
      select: { id: true },
    });
    if (!parent)
      return fail(
        "FORBIDDEN",
        "You do not have access to this parent folder.",
        403,
      );
  }

  const existing = await prisma.folder.findFirst({
    where: {
      name: parsed.data.name,
      parentId,
      ownerId: actor.actorId,
      isTrashed: false,
    },
    include: {
      owner: { select: { email: true, name: true, avatarUrl: true } },
    },
  });

  if (existing) return ok({ file: folderToItem(existing, 0) });

  const folder = await prisma.folder.create({
    data: {
      name: parsed.data.name,
      parentId,
      ownerId: actor.actorId,
    },
    include: {
      owner: { select: { email: true, name: true, avatarUrl: true } },
    },
  });

  return ok({ file: folderToItem(folder, 0) }, 201);
}
