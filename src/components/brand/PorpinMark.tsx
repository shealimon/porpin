import type { SVGProps } from 'react'

import { cn } from '@/lib/utils'

const SATELLITE_RING_R = 33
const SATELLITE_R = 8.25
const CORE_R = 14.5

/**
 * Porpin mark: solid core + eight satellites on a ring (geometric / icon-grid energy, original composition).
 * `currentColor` on all shapes. Loading: `.porpin-mark--loading` spins only the satellite ring (`index.css`).
 */
export function PorpinMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  const satellites = Array.from({ length: 8 }, (_, i) => {
    const deg = i * 45 - 90
    const rad = (deg * Math.PI) / 180
    const x = SATELLITE_RING_R * Math.cos(rad)
    const y = SATELLITE_RING_R * Math.sin(rad)
    return (
      <circle
        key={i}
        cx={x}
        cy={y}
        r={SATELLITE_R}
        fill="currentColor"
        fillOpacity="0.9"
      />
    )
  })

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
      <g transform="translate(50 50)">
        <circle cx={0} cy={0} r={CORE_R} fill="currentColor" fillOpacity="0.96" />
        <g className="porpin-mark__orbit" aria-hidden>
          {satellites}
        </g>
      </g>
    </svg>
  )
}
