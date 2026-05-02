import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

/**
 * Chunky rounded wordmark (ROOND-style energy, not a copy): “PORPIN”, bold Fredoka / Modak fallback, black.
 * Legal name stays “Porpin” for assistive tech.
 */
export function PorpinWordmark({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'relative inline-block min-w-0 max-w-full',
        'text-[1.55rem] tab:text-[1.8rem] sm:text-[2rem]',
        'text-zinc-950 dark:text-zinc-50',
        className,
      )}
      {...props}
    >
      <span className="sr-only">Porpin</span>
      <span
        className="font-wordmark text-inherit font-bold uppercase leading-none tracking-[-0.07em] antialiased"
        aria-hidden
      >
        Porpin
      </span>
    </span>
  )
}
