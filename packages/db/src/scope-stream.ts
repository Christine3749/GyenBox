import type { Prisma, PrismaClient } from "../generated/client"

export const USER_SCOPE = "USER"
export const WORKSPACE_SCOPE = "WORKSPACE"

export type ScopeRef = {
  scopeType: typeof USER_SCOPE | typeof WORKSPACE_SCOPE
  scopeId: string
}

export type ScopeChangeInput = {
  source: "gyenbox" | "keep" | "shurufa" | "safeauth"
  entityType: string
  entityId: string
  action: "UPSERT" | "DELETE"
  mutationId?: string
}

export type ScopeChangePage = {
  cursor: string
  hasMore: boolean
  changes: Array<{
    sequence: string
    source: string
    entityType: string
    entityId: string
    action: "UPSERT" | "DELETE"
  }>
}

type ScopeStreamClient = Prisma.TransactionClient | PrismaClient

const SOURCE_ENTITY_TYPES: Record<ScopeChangeInput["source"], readonly string[]> = {
  gyenbox: ["file", "folder", "folder-tree"],
  keep: ["note", "label"],
  shurufa: ["dictionary", "dictionary-entry", "personal-config"],
  // SafeAuth's only Core-visible object is an opaque encrypted bundle. Never
  // add account, password, TOTP, plaintext search, or preview entities here.
  safeauth: ["encrypted-vault", "vault-recovery"],
}

export function assertScopeChangeContract(change: ScopeChangeInput) {
  if (!SOURCE_ENTITY_TYPES[change.source].includes(change.entityType)) {
    throw new Error(`Unsupported ${change.source} sync entity: ${change.entityType}`)
  }
  if (!/^[A-Za-z0-9_-]{1,191}$/.test(change.entityId)) {
    throw new Error("Sync entity IDs must be opaque identifiers")
  }
}

export function userScope(ownerId: string): ScopeRef {
  return { scopeType: USER_SCOPE, scopeId: ownerId }
}

export function workspaceScope(workspaceId: string): ScopeRef {
  return { scopeType: WORKSPACE_SCOPE, scopeId: workspaceId }
}

export async function appendScopeChange(
  tx: Prisma.TransactionClient,
  scope: ScopeRef,
  change: ScopeChangeInput,
) {
  assertScopeChangeContract(change)
  const stream = await tx.scopeStream.upsert({
    where: { scopeType_scopeId: scope },
    create: { ...scope, nextSequence: 1 },
    update: { nextSequence: { increment: 1 } },
    select: { nextSequence: true },
  })

  await tx.scopeChange.create({
    data: {
      ...scope,
      sequence: stream.nextSequence,
      source: change.source,
      entityType: change.entityType,
      entityId: change.entityId,
      action: change.action,
      mutationId: change.mutationId,
    },
  })

  return stream.nextSequence
}

export async function getScopeCursor(client: ScopeStreamClient, scope: ScopeRef) {
  const stream = await client.scopeStream.findUnique({
    where: { scopeType_scopeId: scope },
    select: { nextSequence: true },
  })
  return (stream?.nextSequence ?? 0n).toString()
}

export async function listScopeChanges(
  client: ScopeStreamClient,
  scope: ScopeRef,
  cursor: bigint,
  pageSize = 100,
): Promise<ScopeChangePage> {
  const take = Math.max(1, Math.min(pageSize, 250))
  const rows = await client.scopeChange.findMany({
    where: { ...scope, sequence: { gt: cursor } },
    orderBy: { sequence: "asc" },
    take: take + 1,
  })
  const page = rows.slice(0, take)
  return {
    // Never advance an idle cursor to a separately-read stream head: a write
    // committed between those two reads could otherwise be skipped forever.
    cursor: page.at(-1)?.sequence.toString() ?? cursor.toString(),
    hasMore: rows.length > take,
    changes: page.map((row) => ({
      sequence: row.sequence.toString(),
      source: row.source,
      entityType: row.entityType,
      entityId: row.entityId,
      action: row.action as "UPSERT" | "DELETE",
    })),
  }
}

export async function rememberScopeMutation(
  tx: Prisma.TransactionClient,
  scope: ScopeRef,
  mutation: { mutationId: string; source: string; entityId?: string },
) {
  return tx.scopeMutation.create({
    data: { ...scope, ...mutation },
  })
}
