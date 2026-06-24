import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "GyenBox 疆域盒子",
  description: "Privacy-first cloud storage for people and teams who own their territory.",
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
