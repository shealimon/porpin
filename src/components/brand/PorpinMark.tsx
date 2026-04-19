import { useId } from 'react'
import type { SVGProps } from 'react'

import { cn } from '@/lib/utils'

/**
 * Porpin mark: monochrome petal burst + open center. No outer frame — silhouette is the petals only.
 * Uses only currentColor. Pair with text-black or text-white on the parent.
 */
export function PorpinMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  const uid = useId().replace(/:/g, '')
  const maskId = `porpin-mask-${uid}`

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        'shrink-0 transition-transform duration-200 ease-out group-hover:scale-[1.06]',
        className,
      )}
      {...props}
    >
      <defs>
        <mask id={maskId}>
          <rect width="100" height="100" fill="white" />
          <circle cx="50" cy="50" r="14" fill="black" />
        </mask>
      </defs>

      <g mask={`url(#${maskId})`}>
        {[0, 45, 90, 135].map((deg) => (
          <ellipse
            key={deg}
            cx="50"
            cy="50"
            rx="48"
            ry="22"
            fill="currentColor"
            transform={`rotate(${deg} 50 50)`}
          />
        ))}
      </g>
    </svg>
  )
}
