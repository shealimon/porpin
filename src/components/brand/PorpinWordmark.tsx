import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

export function PorpinWordmark({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'font-display font-normal leading-none',
        'text-[1.15rem] tracking-[-0.035em] tab:text-[1.3rem]',
        className,
      )}
      {...props}
    >
      Porpin
    </span>
  )
}

