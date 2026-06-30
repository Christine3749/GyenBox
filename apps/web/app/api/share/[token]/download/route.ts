import bcrypt from "bcryptjs"
import { fail } from "@/lib/api-response"
import { createSignedDownloadUrl } from "@/lib/storage"
import { getPrisma } from "@/lib/prisma"

type ShareDownloadRouteProps = {
  params: {
    token: string
  }
}

export const runtime = "nodejs"

export async function GET(request: Request, { params }: ShareDownloadRouteProps) {
  const prisma = getPrisma()
  const share = await prisma.share.findUnique({
    where: { token: params.token },
    include: {
      file: { select: { name: true, mimeType: true, storageKey: true, isTrashed: true } },
    },
  })

  if (!share || !share.file || share.file.isTrashed) {
    return fail("NOT_FOUND", "This share link is not available.", 404)
  }
  if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
    return fail("SHARE_EXPIRED", "This share link has expired.", 410)
  }
  if (share.passwordHash) {
    const password = new URL(request.url).searchParams.get("password") ?? ""
    const validPassword = password ? await bcrypt.compare(password, share.passwordHash) : false
    if (!validPassword) return fail("PASSWORD_REQUIRED", "This share link requires a password.", 401)
  }

  try {
    const signedDownload = await createSignedDownloadUrl({
      key: share.file.storageKey,
      filename: share.file.name,
      contentType: share.file.mimeType,
      expiresInSeconds: 300,
    })

    await prisma.share.update({
      where: { id: share.id },
      data: { accessCount: { increment: 1 } },
    })

    return Response.redirect(signedDownload.url, 302)
  } catch (error) {
    return fail("DOWNLOAD_FAILED", "Could not prepare this shared download yet.", 503, {
      message: error instanceof Error ? error.message : "Unknown storage error",
    })
  }
}
