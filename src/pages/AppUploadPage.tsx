import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'

import { FileInputBar } from '@/components/FileInputBar'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { getCompactGreetingLead, getGreetingDisplayName, getGreetingPhrase } from '@/utils/greeting'

/** Matches Tailwind `desk:` (769px). */
const UPLOAD_NARROW_MQ = '(max-width: 768px)'

function useUploadNarrowLayout(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(UPLOAD_NARROW_MQ).matches : false,
  )

  useEffect(() => {
    const mq = window.matchMedia(UPLOAD_NARROW_MQ)
    const sync = () => setNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return narrow
}

export function AppUploadPage() {
  const firstName = useAuthStore((s) => s.user?.firstName)
  const displayName = getGreetingDisplayName({ firstName })
  const narrow = useUploadNarrowLayout()
  const compactLead = getCompactGreetingLead()
  const greetingFallback = getGreetingPhrase()
  const titlePrimary = displayName ? `${compactLead}, ${displayName}` : greetingFallback

  const lede = (
    <div
      className={cn(
        'dashboard-home__lede mx-auto max-w-[28rem] text-center leading-relaxed text-zinc-500 dark:text-zinc-400',
        narrow ? 'space-y-1.5' : 'space-y-0.5',
        narrow
          ? 'mt-4 max-w-[min(100%,22rem)] px-1 text-[0.9375rem] leading-relaxed text-pretty xs:text-base'
          : 'mt-3 w-full text-sm text-pretty sm:text-[0.9375rem]',
      )}
    >
      <p className="mb-0">Instant word estimate · Pay only when you start a job.</p>
    </div>
  )

  const heroHeading = (
    <h1
      className={cn(
        'font-display mx-auto max-w-full text-pretty text-center font-normal tracking-[-0.02em]',
        'text-zinc-900 dark:text-zinc-50',
        narrow
          ? 'text-[clamp(1.85rem,8.5vw,2.85rem)] leading-[1.15]'
          : 'text-[clamp(1.85rem,4.75vw,2.85rem)] leading-tight',
      )}
    >
      <span className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <Sparkles
          className={cn(
            'shrink-0 text-orange-600/95 dark:text-amber-400/95',
            narrow ? 'size-[1.5rem]' : 'size-8 sm:size-9',
          )}
          strokeWidth={1.65}
          aria-hidden
        />
        <span className="text-balance">{titlePrimary}</span>
      </span>
    </h1>
  )

  const heroDesktop = (
    <div className="dashboard-home__hero flex min-h-0 w-full flex-1 flex-col items-center justify-center text-center">
      <div className="flex w-full max-w-[min(100%,34rem)] flex-col items-center text-center px-3 sm:px-4">
        {heroHeading}
        {lede}
      </div>
    </div>
  )

  /**
   * Mobile: hero in upper flex region; Claude-style greeting + composer card stacks from bottom.
   */
  const heroMobile = (
    <div className="dashboard-home__mobile-upload-hero flex w-full min-w-0 max-w-full flex-1 flex-col justify-center px-0 pb-1 pt-4">
      <div className="mx-auto flex w-full min-w-0 max-w-full flex-col items-center px-0">
        {heroHeading}
        {lede}
      </div>
    </div>
  )

  return (
    <div
      className={cn(
        'dashboard-home relative box-border flex w-full min-w-0 max-w-full flex-col overflow-x-hidden',
        narrow
          ? [
              /* stretch: items-center made the upload column shrink-to-fit and look off-center vs 100vw */
              'flex min-h-0 flex-1 min-w-0 w-full flex-col items-stretch',
              'pb-[max(1.35rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))]',
              'pt-1',
              'has-[.file-input-bar__estimate-card]:pb-4',
            ]
          : [
              'flex min-h-0 w-full flex-1 flex-col items-stretch justify-start',
              'pt-2 pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] sm:pt-3 sm:pb-5',
              'has-[.file-input-bar__estimate-card]:pb-3 desk:has-[.file-input-bar__estimate-card]:pb-5',
            ],
      )}
      aria-label="New translation"
    >
      {!narrow ? <div className="dashboard-home__glow" aria-hidden /> : null}

      <FileInputBar
        composerStyle
        dropTargetClassName={cn(
          'dashboard-home__inner mx-auto w-full min-w-0 box-border animate-fade-up',
          narrow ? 'max-w-full' : 'max-w-2xl',
          narrow
            ? [
                'flex min-h-0 flex-1 flex-col gap-4 self-stretch',
                'min-h-[calc(100dvh-5.75rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))]',
                'pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))]',
              ]
            : [
                /* Fill main pane via flex-1 — do not use ~100dvh min-height here: main scroll padding
                   hides the bottom (chips); flex-1 + min-h-0 fits the padded pane instead. */
                'flex min-h-0 flex-1 flex-col self-stretch',
                'pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))]',
              ],
        )}
        uploadStackClassName={
          narrow
            ? 'max-[768px]:!mt-0 max-[768px]:w-full max-[768px]:max-w-none'
            : cn(
                '!mt-0',
                'has-[.file-input-bar__estimate-card]:sm:!mt-3',
              )
        }
        top={narrow ? heroMobile : heroDesktop}
      />
    </div>
  )
}
