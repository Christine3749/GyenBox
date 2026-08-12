import { fail, ok } from "@/lib/api-response";
import { appendScopeChange, rememberScopeMutation, userScope } from "@gyenbox/db";
import { ensureUserRecord, folderToItem } from "@/lib/file-records";
import { requireActor } from "@/lib/ownership";
import { getPrisma } from "@/lib/prisma";
import { folderCreateSchema } from "@/lib/validations";

export const runtime = "nodejs";

const MUTATION_ID = /^[A-Za-z0-9_-]{16,160}$/;

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
  const mutationId = request.headers.get("x-gyenbox-mutation-id");
  if (mutationId !== null && !MUTATION_ID.test(mutationId)) {
    return fail("INVALID_MUTATION_ID", "Expected a valid client mutation ID.", 400);
  }

  await ensureUserRecord(actor);
  const prisma = getPrisma();
  const scope = userScope(actor.actorId);
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

  const replayMutation = async () => {
    if (!mutationId) return null;
    const mutation = await prisma.scopeMutation.findUnique({
      where: { scopeType_scopeId_mutationId: { ...scope, mutationId } },
      select: { source: true, entityId: true },
    });
    if (mutation?.source !== "gyenbox.folder.create" || !mutation.entityId) return null;
    return prisma.folder.findFirst({
      where: { id: mutation.entityId, ownerId: actor.actorId },
      include: { owner: { select: { email: true, name: true, avatarUrl: true } } },
    });
  };
  const replayed = await replayMutation();
  if (replayed) return ok({ file: folderToItem(replayed, 0) });

  try {
    const folder = await prisma.$transaction(async (tx) => {
      const created = await tx.folder.create({
        data: {
          name: parsed.data.name,
          parentId,
          ownerId: actor.actorId,
        },
        include: {
          owner: { select: { email: true, name: true, avatarUrl: true } },
        },
      });
      if (mutationId) {
        await rememberScopeMutation(tx, scope, {
          mutationId,
          source: "gyenbox.folder.create",
          entityId: created.id,
        });
      }
      await appendScopeChange(tx, scope, {
        source: "gyenbox",
        entityType: "folder",
        entityId: created.id,
        action: "UPSERT",
        mutationId: mutationId ?? undefined,
      });
      return created;
    });

    return ok({ file: folderToItem(folder, 0) }, 201);
  } catch (error) {
    if (mutationId && typeof error === "object" && error && "code" in error && error.code === "P2002") {
      const retried = await replayMutation();
      if (retried) return ok({ file: folderToItem(retried, 0) });
    }
    throw error;
  }
}
