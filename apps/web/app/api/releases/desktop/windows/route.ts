import { NextResponse } from "next/server"

const fallbackDownloadUrl = "https://pub-0e4094438b384def94b53362d317ac70.r2.dev/desktop/windows/GyenBox-Setup-Windows-latest.exe"

export const dynamic = "force-dynamic"

export function GET() {
  const downloadUrl = process.env.DESKTOP_WINDOWS_DOWNLOAD_URL ?? fallbackDownloadUrl
  return NextResponse.redirect(downloadUrl, { status: 302 })
}
