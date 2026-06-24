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
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#0A0E14" />
      <rect x="4.5" y="4.5" width="55" height="55" rx="13.5" stroke="white" strokeOpacity="0.14" />
      <path d="M32 9.5 53 21.5 32 33.5 11 21.5 32 9.5Z" fill="#133047" stroke="#3B82F6" strokeOpacity="0.7" />
      <path d="M11 22 32 34v21L11 43V22Z" fill="#0C1723" stroke="#1D4ED8" strokeOpacity="0.65" />
      <path d="M53 22 32 34v21l21-12V22Z" fill="#122033" stroke="#F97316" strokeOpacity="0.75" />
      <path d="M21 22.3 32 16l11 6.3-11 6.2-11-6.2Z" fill="#F8FAFC" fillOpacity="0.92" />
      <path d="M26.5 22.3 32 19.2l5.5 3.1-5.5 3.1-5.5-3.1Z" fill="#0A0E14" />
      <path d="M20 33.5v7.8l7.3 4.2" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M44 31.5h-8.2c-5.3 0-9.5 4-9.5 9.1 0 5.3 4.2 9.2 9.6 9.2H44" stroke="#FDBA74" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M42 40.6h-7" stroke="#FDBA74" strokeWidth="4" strokeLinecap="round" />
      <path d="M18 22 32 30l14-8" stroke="white" strokeOpacity="0.32" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

export function GyenBoxLogo({ className, markClassName, wordmarkClassName, showSubtitle = false }: GyenBoxLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <GyenBoxMark className={markClassName} />
      <span className="min-w-0">
        <span className={cn("block text-sm font-semibold tracking-normal text-[#F4F1EA]", wordmarkClassName)}>
          Gyen<span className="text-[#FDBA74]">Box</span>
        </span>
        {showSubtitle ? <span className="block text-xs text-[#7E8796]">疆域盒子</span> : null}
      </span>
    </span>
  )
}
