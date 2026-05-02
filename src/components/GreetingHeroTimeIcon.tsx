import { useId } from 'react'

import { cn } from '@/lib/utils'
import type { GreetingHeroIconKind } from '@/utils/greeting'

type Props = {
  kind: GreetingHeroIconKind
  className?: string
}

/** Warm sunrise / sun / sunset / moon marks — filled gradients, readable on light & dark UI. */
export function GreetingHeroTimeIcon({ kind, className }: Props) {
  const raw = useId().replace(/:/g, '')
  const id = (suffix: string) => `ght-${suffix}-${raw}`

  const common = cn(
    'shrink-0 overflow-visible drop-shadow-[0_1px_2px_rgb(234_88_12_/_0.22)] dark:drop-shadow-[0_1px_3px_rgb(251_191_36_/_0.28)]',
    className,
  )

  switch (kind) {
    case 'sunrise':
      return (
        <svg className={common} viewBox="0 0 32 32" fill="none" aria-hidden>
          <defs>
            <linearGradient id={id('rise-main')} x1="16" y1="28" x2="16" y2="4" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ea580c" />
              <stop offset="0.45" stopColor="#f97316" />
              <stop offset="1" stopColor="#fde047" />
            </linearGradient>
            <linearGradient id={id('rise-ray')} x1="16" y1="20" x2="16" y2="6" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fb923c" stopOpacity="0.95" />
              <stop offset="1" stopColor="#fcd34d" stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id={id('rise-glow')} x1="16" y1="24" x2="16" y2="14" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fdba74" stopOpacity="0.55" />
              <stop offset="1" stopColor="#fef9c3" stopOpacity="0" />
            </linearGradient>
          </defs>
          <ellipse cx="16" cy="26" rx="14" ry="5" fill={`url(#${id('rise-glow')})`} />
          <path
            d="M16 6v3M10 8.5l2.2 2.2M6 14h3M22 8.5l-2.2 2.2M26 14h-3"
            stroke={`url(#${id('rise-ray')})`}
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <clipPath id={id('rise-clip')}>
            <rect x="0" y="0" width="32" height="20" />
          </clipPath>
          <circle
            cx="16"
            cy="21"
            r="7.5"
            fill={`url(#${id('rise-main')})`}
            style={{ clipPath: `url(#${id('rise-clip')})` }}
          />
          <path
            d="M3 21c4.2-2.8 9.3-4 13-4s8.8 1.2 13 4"
            stroke="#fed7aa"
            strokeWidth="1.25"
            strokeLinecap="round"
            opacity="0.85"
          />
        </svg>
      )

    case 'noon':
      return (
        <svg className={common} viewBox="0 0 32 32" fill="none" aria-hidden>
          <defs>
            <radialGradient id={id('noon-core')} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(16 15) rotate(90) scale(11 11)">
              <stop stopColor="#fffbeb" />
              <stop offset="0.35" stopColor="#fde047" />
              <stop offset="0.75" stopColor="#f59e0b" />
              <stop offset="1" stopColor="#ea580c" />
            </radialGradient>
            <linearGradient id={id('noon-ray')} x1="16" y1="15" x2="16" y2="2" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fbbf24" stopOpacity="0.9" />
              <stop offset="1" stopColor="#fb923c" stopOpacity="0.25" />
            </linearGradient>
          </defs>
          <g strokeLinecap="round" strokeWidth="2">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <line
                key={deg}
                x1="16"
                y1="15"
                x2={16 + 11 * Math.sin((deg * Math.PI) / 180)}
                y2={15 - 11 * Math.cos((deg * Math.PI) / 180)}
                stroke={`url(#${id('noon-ray')})`}
              />
            ))}
          </g>
          <circle cx="16" cy="15" r="7" fill={`url(#${id('noon-core')})`} />
        </svg>
      )

    case 'afternoon':
      return (
        <svg className={common} viewBox="0 0 32 32" fill="none" aria-hidden>
          <defs>
            <linearGradient id={id('aft-sun')} x1="12" y1="22" x2="12" y2="6" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f97316" />
              <stop offset="0.55" stopColor="#fbbf24" />
              <stop offset="1" stopColor="#fef08a" />
            </linearGradient>
            <linearGradient id={id('aft-cloud')} x1="22" y1="14" x2="26" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fff7ed" />
              <stop offset="0.5" stopColor="#ffedd5" />
              <stop offset="1" stopColor="#fdba74" stopOpacity="0.85" />
            </linearGradient>
          </defs>
          <circle cx="11.5" cy="13.5" r="6.25" fill={`url(#${id('aft-sun')})`} />
          <path
            d="M17 22.5h8.2c2.3 0 4.1-1.7 4.1-3.85 0-1.55-1-2.9-2.4-3.45a4.6 4.6 0 0 0-8.75-1.1A3.35 3.35 0 0 0 17 22.5z"
            fill={`url(#${id('aft-cloud')})`}
            opacity="0.98"
          />
          <path
            d="M17 22.5h8.2c2.3 0 4.1-1.7 4.1-3.85 0-1.55-1-2.9-2.4-3.45a4.6 4.6 0 0 0-8.75-1.1A3.35 3.35 0 0 0 17 22.5z"
            stroke="#fed7aa"
            strokeWidth="0.75"
            opacity="0.6"
          />
        </svg>
      )

    case 'evening':
      return (
        <svg className={common} viewBox="0 0 32 32" fill="none" aria-hidden>
          <defs>
            <linearGradient id={id('eve-sky')} x1="4" y1="18" x2="28" y2="10" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fb923c" stopOpacity="0.35" />
              <stop offset="0.5" stopColor="#f97316" />
              <stop offset="1" stopColor="#ea580c" />
            </linearGradient>
            <linearGradient id={id('eve-sun')} x1="16" y1="26" x2="16" y2="12" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f97316" />
              <stop offset="0.4" stopColor="#fb923c" />
              <stop offset="1" stopColor="#fde047" />
            </linearGradient>
          </defs>
          <path d="M2 14h28v12H2z" fill={`url(#${id('eve-sky')})`} opacity="0.5" />
          <clipPath id={id('eve-clip')}>
            <rect x="0" y="0" width="32" height="19" />
          </clipPath>
          <circle
            cx="16"
            cy="21"
            r="7.75"
            fill={`url(#${id('eve-sun')})`}
            style={{ clipPath: `url(#${id('eve-clip')})` }}
          />
          <path
            d="M2 21c5.5-1.2 11-1.8 14-1.8s8.5 0.6 14 1.8"
            stroke="#fdba74"
            strokeWidth="1.25"
            strokeLinecap="round"
            opacity="0.9"
          />
        </svg>
      )

    case 'night':
      return (
        <svg className={common} viewBox="0 0 32 32" fill="none" aria-hidden>
          <defs>
            <linearGradient id={id('night-moon')} x1="12" y1="8" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fde68a" />
              <stop offset="0.45" stopColor="#fbbf24" />
              <stop offset="1" stopColor="#f59e0b" />
            </linearGradient>
            <radialGradient id={id('night-star')} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(20 9) rotate(90) scale(2.5)">
              <stop stopColor="#fffbeb" />
              <stop offset="1" stopColor="#fcd34d" stopOpacity="0.9" />
            </radialGradient>
          </defs>
          <path
            d="M18.5 9.2a7.2 7.2 0 1 0 6.8 12.4 6.2 6.2 0 0 1-5.8-10 7 7 0 0 0-1-2.4z"
            fill={`url(#${id('night-moon')})`}
          />
          <circle cx="23.5" cy="10.5" r="1.15" fill={`url(#${id('night-star')})`} />
          <circle cx="9" cy="13" r="0.85" fill="#fcd34d" opacity="0.95" />
          <circle cx="25" cy="17" r="0.65" fill="#fde68a" opacity="0.85" />
        </svg>
      )
  }
}
