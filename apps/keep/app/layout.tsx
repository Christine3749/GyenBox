import type { Metadata } from "next"
import Script from "next/script"
import "./globals.css"

const themeBootstrap = `
  try {
    const saved = localStorage.getItem('keep_notes_theme_v1');
    const dark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch {}
`

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
    <html lang="en" suppressHydrationWarning>
      <Script id="keep-theme-bootstrap" strategy="beforeInteractive">
        {themeBootstrap}
      </Script>
      <body>{children}</body>
    </html>
  )
}
