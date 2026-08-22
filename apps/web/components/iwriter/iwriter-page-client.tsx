"use client"

import dynamic from "next/dynamic"

const IWriterApp = dynamic(
  () => import("./iwriter-app").then((module) => module.IWriterApp),
  {
    ssr: false,
    loading: () => (
      <main className="grid min-h-screen place-items-center bg-[#F8F8F8] text-[#1A1A1A]">
        <div className="text-center">
          <p className="font-mono text-xs tracking-[0.2em] text-black/40">GYENBOX</p>
          <h1 className="mt-3 text-2xl font-semibold">iWriter</h1>
          <p className="mt-2 text-sm text-black/45">正在打开写作空间…</p>
        </div>
      </main>
    ),
  },
)

export function IWriterPageClient() {
  return <IWriterApp />
}
