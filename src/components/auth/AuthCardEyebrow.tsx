import { Sparkles } from 'lucide-react'

import { cn } from '@/lib/utils'

type AuthCardEyebrowProps = {
  label: string
  /** `light` matches landing / zinc-50 auth pages. */
  variant?: 'dark' | 'light'
}

/** Upper pill on login / signup / forgot cards (shared layout). */
export function AuthCardEyebrow({ label, variant = 'dark' }: AuthCardEyebrowProps) {
  return (
    <p
      className={cn(
        'mx-auto flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em]',
        variant === 'light'
          ? 'border-zinc-200 bg-white text-zinc-500'
          : 'border-white/15 bg-white/[0.06] text-zinc-300',
      )}
    >
      <Sparkles
        className={cn('size-3', variant === 'light' ? 'text-zinc-400' : 'text-voltix-lime')}
        strokeWidth={2}
        aria-hidden
      />
      {label}
    </p>
  )
}

export const AUTH_EYEBROW_ACCOUNT_ACCESS = 'Account access'
export const AUTH_EYEBROW_NEW_ACCOUNT = 'New account'
