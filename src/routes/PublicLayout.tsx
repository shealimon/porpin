import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

import { PorpinMark } from '@/components/brand/PorpinMark'
import { cn } from '@/lib/utils'
import {
  publicNavActiveClass,
  publicNavInactiveClass,
  publicNavSignupClass,
} from '@/lib/publicHeaderNavStyles'

function normalizePublicPath(pathname: string) {
  const trimmed = pathname.replace(/\/index\.html$/i, '')
  return trimmed.replace(/\/+$/, '') || '/'
}

export function PublicLayout() {
  const { pathname, hash } = useLocation()
  const navigate = useNavigate()
  const path = normalizePublicPath(pathname)
  const onLanding = path === '/'
  const onLogin = path === '/login'
  const onSignup = path === '/signup'
  const onForgotPassword = path === '/forgot-password'
  const onLightMarketing =
    onLanding || onLogin || onSignup || onForgotPassword
  const onPricing = path === '/pricing' || (onLanding && hash === '#pricing')
  const loginNavActive = onLogin || onForgotPassword
  /** Black signup CTA only on home (no #pricing) and on /signup; muted when Pricing or Log in is current. */
  const signupProminent =
    onSignup || (onLanding && !onPricing && !onLogin && !onForgotPassword)

  const navInactive = publicNavInactiveClass
  const navActive = publicNavActiveClass
  const [menuOpen, setMenuOpen] = useState(false)
  const menuSurfaceRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname, hash])

  useEffect(() => {
    if (!menuOpen) return

    const onPointerDown = (e: PointerEvent) => {
      const el = menuSurfaceRef.current
      if (el && !el.contains(e.target as Node)) setMenuOpen(false)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  const onHomeLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!onLanding) return
    e.preventDefault()
    if (hash) {
      navigate({ pathname: '/', hash: '' }, { replace: true })
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /** Drawer-only: compact so Pricing / Log in / Sign up fit small viewports; min 44px tap height. */
  const mobileDrawerLinkBase = cn(
    'box-border flex min-h-11 w-full min-w-0 shrink-0 items-center justify-center rounded-full border-2 border-solid px-4 py-2.5 text-center font-outfit text-sm leading-tight no-underline transition-colors sm:px-5',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  )
  const mobileDrawerMuted = cn(
    mobileDrawerLinkBase,
    'border-border bg-background/90 font-medium text-foreground hover:bg-muted',
  )
  const mobileDrawerActive = cn(
    mobileDrawerLinkBase,
    'border-primary bg-primary font-semibold text-primary-foreground shadow-md hover:opacity-90',
  )
  const mobileDrawerSignup = cn(
    mobileDrawerLinkBase,
    'border-zinc-900 bg-zinc-900 font-semibold text-white hover:bg-zinc-800 hover:text-white',
  )

  return (
    <div
      data-public-shell={onLightMarketing ? 'voltix-marketing-light' : 'voltix-marketing-dark'}
      className="flex min-h-svh min-w-0 flex-col overflow-x-clip bg-background font-outfit text-[0.9375rem] text-foreground antialiased tab:text-base"
    >
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-6xl min-w-0 items-center justify-between gap-3 px-4 py-3 tab:px-6 tab:py-4">
          <Link
            to="/"
            onClick={onHomeLogoClick}
            className={cn(
              'group relative flex min-w-0 max-w-[min(100%,14rem)] shrink-0 items-center gap-2.5 no-underline transition duration-200',
              'hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'active:scale-[0.97]',
              onLightMarketing ? 'text-zinc-950' : 'text-white',
            )}
            aria-label="Porpin home"
          >
            <span className="relative flex size-10 shrink-0 items-center justify-center">
              <PorpinMark className="size-full" aria-hidden />
            </span>
            {onLanding ? (
              <span className="text-sm font-semibold tracking-tight tab:text-base">Porpin</span>
            ) : null}
          </Link>

          <nav
            className="hidden max-w-full flex-wrap items-center justify-end gap-2 desk:flex desk:gap-3"
            aria-label="Marketing"
          >
            <Link
              to="/#pricing"
              className={onPricing ? navActive : navInactive}
              aria-current={onPricing ? 'page' : undefined}
            >
              Pricing
            </Link>
            <Link
              to="/login"
              className={loginNavActive ? navActive : navInactive}
              aria-current={onLogin ? 'page' : undefined}
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className={cn(
                signupProminent ? publicNavSignupClass : publicNavInactiveClass,
                signupProminent &&
                  onSignup &&
                  'ring-2 ring-zinc-900/20 ring-offset-2 ring-offset-background',
              )}
              aria-current={onSignup ? 'page' : undefined}
            >
              Sign up
            </Link>
          </nav>

          <div ref={menuSurfaceRef} className="relative flex shrink-0 desk:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className={cn(
                'inline-flex size-11 items-center justify-center rounded-full border border-border bg-background/90 text-foreground transition',
                'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              )}
              aria-expanded={menuOpen}
              aria-controls="public-nav-drawer"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <X className="size-5 shrink-0" aria-hidden /> : <Menu className="size-5 shrink-0" aria-hidden />}
            </button>

            {menuOpen ? (
              <>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden
                  className="fixed inset-0 z-[80] bg-black/45"
                  onClick={closeMenu}
                />
                <aside
                  id="public-nav-drawer"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Site navigation"
                  className={cn(
                    'fixed right-0 top-0 z-[90] flex h-svh max-h-dvh min-h-0 w-[min(20rem,calc(100vw-1rem))] max-w-full min-w-0 flex-col overflow-hidden',
                    'border-l border-border bg-background shadow-2xl',
                    'pt-[max(0px,env(safe-area-inset-top))] pb-[max(0px,env(safe-area-inset-bottom))]',
                  )}
                >
                  <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2.5">
                    <p className="min-w-0 truncate text-sm font-semibold">Menu</p>
                    <button
                      type="button"
                      onClick={closeMenu}
                      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                      aria-label="Close menu"
                    >
                      <X className="size-5" aria-hidden />
                    </button>
                  </div>
                  <nav
                    className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-y-contain px-3 py-3"
                    aria-label="Marketing mobile"
                  >
                    <Link
                      to="/#pricing"
                      className={onPricing ? mobileDrawerActive : mobileDrawerMuted}
                      aria-current={onPricing ? 'page' : undefined}
                      onClick={closeMenu}
                    >
                      Pricing
                    </Link>
                    <Link
                      to="/login"
                      className={loginNavActive ? mobileDrawerActive : mobileDrawerMuted}
                      aria-current={onLogin ? 'page' : undefined}
                      onClick={closeMenu}
                    >
                      Log in
                    </Link>
                    <Link
                      to="/signup"
                      className={cn(
                        signupProminent ? mobileDrawerSignup : mobileDrawerMuted,
                        signupProminent &&
                          onSignup &&
                          'ring-2 ring-zinc-900/25 ring-offset-2 ring-offset-background',
                      )}
                      aria-current={onSignup ? 'page' : undefined}
                      onClick={closeMenu}
                    >
                      Sign up
                    </Link>
                  </nav>
                </aside>
              </>
            ) : null}
          </div>
        </div>
      </header>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-clip">
        <Outlet />
      </main>
    </div>
  )
}
