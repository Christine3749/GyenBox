import type { Metadata } from "next"

import { IWriterPageClient } from "@/components/iwriter/iwriter-page-client"

export const metadata: Metadata = {
  title: "iWriter by GyenBox",
  description: "A local-first writing, canvas, graph, and document workspace by GyenBox.",
  icons: {
    icon: [
      { url: "/iwriter/brand/favicon.ico" },
      { url: "/iwriter/brand/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/iwriter/brand/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/iwriter/brand/apple-touch-icon.png",
  },
}

export default function IWriterPage() {
  return <IWriterPageClient />
}
