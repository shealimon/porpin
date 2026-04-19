import { cn } from '@/lib/utils'

/** Pill styles for public header nav links (inactive / muted). */
export const publicNavInactiveClass = cn(
  'inline-flex h-10 box-border items-center justify-center rounded-full border border-solid border-border bg-background/90 px-6 font-outfit text-sm font-medium text-foreground no-underline backdrop-blur-sm transition-colors',
  'hover:bg-muted hover:text-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
)

/** Pill styles for public header active CTA — use for auth submit buttons too. */
export const publicNavActiveClass = cn(
  'inline-flex h-10 box-border items-center justify-center rounded-full border-2 border-solid border-primary bg-primary px-6 font-outfit text-sm font-semibold text-primary-foreground no-underline shadow-md transition',
  'hover:opacity-90 active:scale-[0.98]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
)

/** Sign up — always solid black (not the muted inactive pill). */
export const publicNavSignupClass = cn(
  'inline-flex h-10 box-border items-center justify-center rounded-full border border-solid border-zinc-900 bg-zinc-900 px-6 font-outfit text-sm font-semibold text-white no-underline shadow-sm transition-colors',
  'hover:bg-zinc-800 hover:text-white active:scale-[0.98]',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
)
