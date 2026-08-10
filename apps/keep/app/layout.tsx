import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Gyen Keep",
  description: "Quick notes and checklists for your GyenBox account.",
  icons: {
    // Versioned URLs bypass the previous brand's long-lived browser/CDN icon cache.
    icon: "/icon.svg?v=keep-studio-20260809",
    apple: "/apple-icon.svg?v=keep-studio-20260809",
  },
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
