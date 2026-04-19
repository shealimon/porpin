import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PorpinMark } from '@/components/brand/PorpinMark'
import { LandingUploadPreview } from '@/components/landing/LandingUploadPreview'
import { PricingPlans } from '@/components/landing/PricingPlans'
import { cn } from '@/lib/utils'

export function LandingPage() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (pathname !== '/' || hash !== '#pricing') return
    const t = window.setTimeout(() => {
      document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
    return () => clearTimeout(t)
  }, [pathname, hash])

  return (
    <div
      className={cn(
        'voltix-landing relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#f6f4f1] font-sans text-stone-600 antialiased',
        'selection:bg-orange-200/35 selection:text-stone-900',
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_85%_55%_at_50%_-18%,rgba(234,88,12,0.07),transparent_58%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_40%_at_100%_0%,rgba(120,113,108,0.06),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(246,244,241,0)_0%,#f6f4f1_100%)]"
        aria-hidden
      />

      <section
        aria-labelledby="landing-hero-heading"
        className="mx-auto flex min-h-[calc(100svh-4.5rem)] max-w-6xl flex-col justify-center px-4 pb-16 pt-14 sm:min-h-[calc(100svh-4.75rem)] sm:pb-24 sm:pt-20"
      >
        <div className="mx-auto max-w-5xl text-center">
          <h1
            id="landing-hero-heading"
            className={cn(
              'voltix-fade-in animate-fade-up-delay-1 !m-0 font-display !text-[clamp(2.85rem,8.2vw,5.75rem)] !font-normal !leading-[1.04] !tracking-[-0.038em] text-stone-900 opacity-0 motion-reduce:opacity-100 [animation-fill-mode:forwards]',
            )}
          >
            <span className="block">
              Turn your content into{' '}
              <span className="relative inline-block">
                <span className="relative z-[1]">natural Hinglish</span>
                <span
                  className="absolute -inset-x-1 -bottom-0.5 top-[62%] -z-0 rounded-sm bg-orange-200/70 sm:-inset-x-1.5"
                  aria-hidden
                />
              </span>
              .
            </span>
            <span className="mx-auto mt-8 block max-w-2xl !text-lg !font-normal !leading-relaxed !tracking-normal text-stone-600 sm:mt-10 sm:max-w-3xl sm:!text-xl">
              Upload a file—get Hinglish that sounds natural and familiar.
            </span>
          </h1>

          <div
            className={cn(
              'voltix-fade-in animate-fade-up-delay-2 mt-12 flex justify-center sm:mt-14',
              'opacity-0 motion-reduce:opacity-100 [animation-fill-mode:forwards]',
            )}
          >
            <Link
              to="/signup"
              className={cn(
                'inline-flex min-h-14 w-full max-w-[18rem] items-center justify-center rounded-full bg-stone-900 px-10 text-base font-semibold text-white shadow-lg shadow-stone-900/15 no-underline transition sm:min-h-[3.75rem] sm:max-w-none sm:px-12 sm:text-lg',
                'hover:bg-stone-800 active:scale-[0.98]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f4f1]',
                'sm:w-auto sm:min-w-[14rem]',
              )}
            >
              Start free
            </Link>
          </div>
        </div>

        <p
          className={cn(
            'voltix-fade-in animate-fade-up-delay-3 mx-auto mt-16 max-w-xl text-center font-display text-xl font-normal italic leading-snug text-stone-700 sm:mt-20 sm:max-w-2xl sm:text-2xl',
            'opacity-0 motion-reduce:opacity-100 [animation-fill-mode:forwards]',
          )}
        >
          Less friction, more natural reading.
        </p>

        <div
          id="demo"
          className={cn(
            'voltix-fade-in animate-fade-up-delay-3 scroll-mt-28 relative mx-auto mt-16 w-full max-w-4xl opacity-0 motion-reduce:opacity-100 [animation-fill-mode:forwards] sm:mt-20',
          )}
        >
          <div className="mb-8 text-center sm:mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500 sm:text-[13px]">
              Preview
            </p>
            <p className="mt-3 font-display text-2xl font-normal tracking-tight text-stone-900 sm:mt-3.5 sm:text-3xl">
              The same flow you get in the app
            </p>
          </div>
          <div
            className="absolute -inset-2 rounded-[1.35rem] bg-gradient-to-b from-stone-300/40 via-orange-200/20 to-transparent blur-xl"
            aria-hidden
          />
          <LandingUploadPreview />
        </div>
      </section>

      <PricingPlans variant="landing" />

      <footer className="mt-auto border-t border-stone-200/80 bg-white/90 py-12 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 text-center">
          <Link
            to="/"
            className={cn(
              'group flex shrink-0 items-center gap-2.5 no-underline transition duration-200',
              'text-stone-950 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
              'active:scale-[0.97]',
            )}
            aria-label="Porpin home"
          >
            <span className="flex size-10 shrink-0 items-center justify-center">
              <PorpinMark className="size-full" aria-hidden />
            </span>
            <span className="text-sm font-semibold tracking-tight tab:text-base">Porpin</span>
          </Link>
          <p className="text-sm text-stone-500">© 2026 Porpin</p>
        </div>
      </footer>
    </div>
  )
}
