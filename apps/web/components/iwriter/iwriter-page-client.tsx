"use client"

import dynamic from "next/dynamic"
import Image from "next/image"

const IWriterApp = dynamic(
  () => import("./iwriter-app").then((module) => module.IWriterApp),
  {
    ssr: false,
    loading: () => (
      <main className="grid min-h-screen place-items-center bg-[#F8F8F8] text-[#1A1A1A]">
        <div className="text-center">
          <Image src="/iwriter/brand/mark.svg" alt="" width={80} height={80} priority className="mx-auto" />
          <Image src="/iwriter/brand/logo-light.svg" alt="iWriter by GyenBox" width={1400} height={360} priority className="mx-auto mt-3 h-auto w-52" />
          <p className="mt-3 text-sm text-black/45">正在打开写作空间…</p>
        </div>
      </main>
    ),
  },
)

export function IWriterPageClient() {
  return <IWriterApp />
}
