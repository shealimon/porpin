import type { ReactNode } from 'react'

/** Auth pages on the same neutral canvas as the in-app dashboard (`--manus-canvas`). */
export function AuthLightPageSurface({ children }: { children: ReactNode }) {
  return (
       <div className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden bg-[#f6f4f1] font-sans text-[0.9375rem] text-stone-600 antialiased tab:text-base">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_85%_55%_at_50%_-25%,rgba(234,88,12,0.05),transparent_55%)]"
        aria-hidden
      />
      {children}
    </div>
  )
}
