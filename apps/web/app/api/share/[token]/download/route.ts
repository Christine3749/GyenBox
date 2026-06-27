import bcrypt from "bcryptjs"
import { fail } from "@/lib/api-response"
import { downloadObject } from "@/lib/gcs"
import { getPrisma } from "@/lib/prisma"

type ShareDownloadRouteProps = {
  params: {
    token: string
  }
}

export const runtime = "nodejs"

export async function GET(request: Request, { params }: ShareDownloadRouteProps) {
  const share = await getPrisma().share.findUnique({
    where: { token: params.token },
    include: {
      file: { select: { name: true, mimeType: true, size: true, storageKey: true, isTrashed: true } },
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

  const buffer = await downloadObject(share.file.storageKey)
  await getPrisma().share.update({
    where: { id: share.id },
    data: { accessCount: { increment: 1 } },
  })

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": share.file.mimeType,
      "Content-Length": String(share.file.size),
      "Content-Disposition": `attachment; filename="${sanitizeDownloadName(share.file.name)}"`,
    },
  })
}

function sanitizeDownloadName(name: string) {
  return name.replace(/[\r\n"]/g, "").trim() || "gyenbox-file"
}
