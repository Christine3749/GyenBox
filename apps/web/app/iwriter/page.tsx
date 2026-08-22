import type { Metadata } from "next"

import { IWriterPageClient } from "@/components/iwriter/iwriter-page-client"

export const metadata: Metadata = {
  title: "iWriter by GyenBox",
  description: "A local-first writing, canvas, graph, and document workspace by GyenBox.",
}

export default function IWriterPage() {
  return <IWriterPageClient />
}
