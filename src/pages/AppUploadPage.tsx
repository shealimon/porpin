import { FileInputBar } from '@/components/FileInputBar'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { getGreetingDisplayName, getGreetingPhrase } from '@/utils/greeting'

export function AppUploadPage() {
  const firstName = useAuthStore((s) => s.user?.firstName)
  const phrase = getGreetingPhrase()
  const displayName = getGreetingDisplayName({ firstName })

  return (
    <div
      className={cn(
        /* items-stretch + self-center inner avoids flex “shrink-to-fit” that shifts the upload bar on mobile */
        'dashboard-home relative box-border flex w-full min-w-0 max-w-full flex-col items-stretch justify-start overflow-x-hidden',
        'pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]',
        'sm:pt-9 sm:pb-12',
        'has-[.file-input-bar__estimate-card]:pb-3 has-[.file-input-bar__estimate-card]:sm:pb-6',
      )}
      aria-label="New translation"
    >
      <div className="dashboard-home__glow" aria-hidden />

      <FileInputBar
        dropTargetClassName={cn(
          'dashboard-home__inner mx-auto w-full min-w-0 max-w-2xl shrink-0 self-center animate-fade-up',
        )}
        top={
          <div className="dashboard-home__hero">
            <h1
              className={cn(
                'font-display text-center text-[clamp(1.35rem,4.5vw,2.5rem)] font-normal leading-tight tracking-[-0.02em]',
                'text-balance text-zinc-900 dark:text-zinc-50',
              )}
            >
              {displayName ? (
                <>
                  {phrase},{' '}
                  <span className="relative inline-block">
                    <span className="relative z-[1] text-orange-950 dark:text-amber-100">
                      {displayName}
                    </span>
                    <span
                      className="absolute -inset-x-1 -bottom-0.5 top-[62%] -z-0 rounded-sm bg-orange-200/70 sm:-inset-x-1.5 dark:bg-amber-400/40"
                      aria-hidden
                    />
                  </span>
                </>
              ) : (
                <span className="text-balance">{phrase}</span>
              )}
            </h1>
            <div
              className={cn(
                'dashboard-home__lede mx-auto mt-2.5 max-w-[28rem] space-y-1 text-center text-sm leading-relaxed text-zinc-600 dark:text-zinc-400',
                'text-pretty sm:mt-3 sm:text-[0.9375rem]',
              )}
            >
              <p className="mb-0">
                Upload or drag & drop a file for instant word count & price
              </p>
              <p className="mb-0">Translate when you're ready</p>
            </div>
          </div>
        }
      />
    </div>
  )
}
