import type { Metadata } from "next"
import "./globals.css"

const themeBootstrap = `
  try {
    const saved = localStorage.getItem('keep_notes_theme_v1');
    const dark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.style.backgroundColor = dark ? '#09090b' : '#f4f4f5';
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
