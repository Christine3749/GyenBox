import { NextResponse } from "next/server"

const fallbackDownloadUrl = "https://storage.googleapis.com/gyenbox-downloads-1004693447123/desktop/windows/GyenBox-Desktop-0.1.1-x64.exe"

export const dynamic = "force-dynamic"

export function GET() {
  const downloadUrl = process.env.DESKTOP_WINDOWS_DOWNLOAD_URL ?? fallbackDownloadUrl
  return NextResponse.redirect(downloadUrl, { status: 302 })
}
