"use client"

import { cn } from "@/lib/utils"

type GyenBoxMarkProps = {
  className?: string
  title?: string
}

type GyenBoxLogoProps = {
  className?: string
  markClassName?: string
  wordmarkClassName?: string
  showSubtitle?: boolean
}

export function GyenBoxMark({ className, title = "GyenBox" }: GyenBoxMarkProps) {
  return (
    <img
      src="/brand/gyenbox-logo.png"
      alt={title}
      className={cn("h-9 w-9 shrink-0 rounded-[8px] object-contain", className)}
    />
  )
}
export function GyenBoxLogo({ className, markClassName, wordmarkClassName, showSubtitle = false }: GyenBoxLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <GyenBoxMark className={markClassName} />
      <span className="min-w-0 leading-none">
        <span className={cn("block text-[15px] font-bold tracking-[0.02em] text-[var(--gb-ink)]", wordmarkClassName)}>
          GYEN<span className="text-[#5F74C4]">BOX</span>
        </span>
        {showSubtitle ? (
          <span className="mt-1 block text-[10px] font-bold tracking-[0.24em] text-[var(--gb-muted)]">
            疆域盒子
          </span>
        ) : null}
      </span>
    </span>
  )
}
