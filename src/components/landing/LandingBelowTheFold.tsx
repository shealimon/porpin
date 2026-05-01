import { LandingUploadPreview } from '@/components/landing/LandingUploadPreview'
import { PricingPlans } from '@/components/landing/PricingPlans'
import { SocialProofSection } from '@/components/landing/SocialProofSection'
import { cn } from '@/lib/utils'

/**
 * Defer non-critical work on the home page: the hero can paint before this chunk is fetched.
 */
export function LandingBelowTheFold() {
  return (
    <>
      <div
        id="demo"
        className={cn(
          'voltix-fade-in animate-fade-up-delay-3 relative mx-auto mt-8 w-full min-w-0 max-w-4xl scroll-mt-28 overflow-x-visible opacity-0 motion-reduce:opacity-100 [animation-fill-mode:forwards] sm:mt-10 lg:-mt-4',
        )}
      >
        <div
          className="pointer-events-none absolute -inset-1 rounded-[1.35rem] bg-gradient-to-b from-orange-200/55 via-amber-100/45 to-orange-50/35 blur-2xl sm:-inset-[10px] sm:rounded-[1.6rem]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -inset-0.5 rounded-[1.2rem] bg-gradient-to-tr from-white/70 via-orange-50/25 to-transparent sm:-inset-1 sm:rounded-[1.35rem]"
          aria-hidden
        />
        <LandingUploadPreview />
      </div>

      <div className="mt-12 w-full min-w-0 sm:mt-16">
        <PricingPlans variant="landing" />
      </div>

      <div className="mt-16 w-full min-w-0 sm:mt-20">
        <SocialProofSection />
      </div>
    </>
  )
}
