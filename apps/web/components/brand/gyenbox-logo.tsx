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
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={cn("h-9 w-9 shrink-0", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="6.5" y="6.5" width="51" height="51" rx="5.5" fill="#FFFDF9" stroke="rgba(26,26,26,0.18)" />
      <path d="M32 11.5 51 22.3 32 33 13 22.3 32 11.5Z" fill="#E7EAF5" stroke="#1A1A1A" strokeOpacity="0.52" strokeWidth="1.4" />
      <path d="M13 22.5 32 33.2v19.3L13 41.8V22.5Z" fill="#F4F2EE" stroke="#1A1A1A" strokeOpacity="0.42" strokeWidth="1.4" />
      <path d="M51 22.5 32 33.2v19.3l19-10.7V22.5Z" fill="#DDE3F4" stroke="#1A1A1A" strokeOpacity="0.42" strokeWidth="1.4" />
      <path d="M22.2 22.6 32 17.1l9.8 5.5L32 28.1l-9.8-5.5Z" fill="#FFFDF9" stroke="#5F74C4" strokeWidth="1.7" />
      <path d="M24.8 38.2c0 3.8 3 6.4 7.2 6.4h7.8" stroke="#5F74C4" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M24.8 38.2h-4.6v-6.9" stroke="#8896C6" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M39.5 38.3h-7.1" stroke="#1A1A1A" strokeOpacity="0.72" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M18 22.6 32 30.4l14-7.8" stroke="#1A1A1A" strokeOpacity="0.22" strokeWidth="1" />
    </svg>
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
