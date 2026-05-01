import type { SVGProps } from 'react'

import { cn } from '@/lib/utils'

/**
 * Porpin mark: balanced “spark” inside a circle (AI-assistant style).
 * Uses only currentColor. Pair with text-black or text-white on the parent.
 */
export function PorpinMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        'porpin-mark shrink-0 transition-transform duration-200 ease-out group-hover:scale-[1.06]',
        className,
      )}
      {...props}
    >
      {/* Outer halo: keeps the mark recognizable at tiny sizes */}
      <circle
        cx="50"
        cy="50"
        r="40"
        stroke="currentColor"
        strokeOpacity="0.92"
        strokeWidth="6"
        fill="none"
      />

      {/* Inner mark: symmetric spark + orbit dots (orbit group is animated in loading state). */}
      <g className="porpin-mark__spark" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {/* 8-ray spark */}
        <path
          d="M50 31.5V41.5M50 58.5V68.5M31.5 50H41.5M58.5 50H68.5"
          strokeWidth="6.5"
          opacity="0.95"
        />
        <path
          d="M37.7 37.7L44.8 44.8M55.2 55.2L62.3 62.3M62.3 37.7L55.2 44.8M44.8 55.2L37.7 62.3"
          strokeWidth="6.5"
          opacity="0.95"
        />

        {/* Center dot */}
        <circle cx="50" cy="50" r="3.6" fill="currentColor" stroke="none" opacity="0.98" />
      </g>

      <g className="porpin-mark__orbit" aria-hidden>
        <circle cx="50" cy="23.5" r="2.9" fill="currentColor" opacity="0.92" />
        <circle cx="76.5" cy="50" r="2.9" fill="currentColor" opacity="0.92" />
        <circle cx="50" cy="76.5" r="2.9" fill="currentColor" opacity="0.92" />
        <circle cx="23.5" cy="50" r="2.9" fill="currentColor" opacity="0.92" />
      </g>
    </svg>
  )
}
