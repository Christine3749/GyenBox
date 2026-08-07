import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Keep — GyenBox",
  description: "Quick notes and checklists for your GyenBox account.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
