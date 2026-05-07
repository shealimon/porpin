import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogIn, Sparkles, UserPlus, X } from 'lucide-react'

import { PorpinMark } from '@/components/brand/PorpinMark'
import { PorpinWordmark } from '@/components/brand/PorpinWordmark'
import { cn } from '@/lib/utils'
import {
  publicNavActiveClass,
  publicNavInactiveClass,
  publicNavSignupClass,
} from '@/lib/publicHeaderNavStyles'
import { PublicNavHamburgerGlyph } from '@/components/public-nav/PublicNavHamburgerGlyph'

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
  const onResetPassword = path === '/reset-password'
  const onAuthConfirm = path === '/auth/confirm'
  const onLightMarketing =
    onLanding ||
    onLogin ||
    onSignup ||
    onForgotPassword ||
    onResetPassword ||
    onAuthConfirm
  /** Login/signup/forgot/reset: let main grow past the viewport on desktop so the window scrolls. */
  const authDesktopDocumentScroll =
    onLogin || onSignup || onForgotPassword || onResetPassword
  const onPricing = path === '/pricing' || (onLanding && hash === '#pricing')
  const loginNavActive = onLogin || onForgotPassword
  /** Logo + wordmark on landing and light auth routes (login / signup / forgot). */
  const showHeaderWordmark = onLightMarketing
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

  /** Match `AppLayout` menu alignment: fixed icon slot + label line-height. */
  const publicMenuIconMutedClass = 'text-zinc-500 dark:text-zinc-400'
  const publicMenuIconOnSolidClass = 'text-current opacity-90'
  const publicMobileIconWrapClass =
    'inline-flex size-[1.375rem] shrink-0 items-center justify-center [&_svg]:block [&_svg]:size-[1.125rem]'
  const publicMobileMenuLabelClass =
    'min-w-0 flex-1 text-base font-medium leading-[1.375rem] text-inherit'
  const publicDrawerIconWrapClass =
    'inline-flex size-5 shrink-0 items-center justify-center [&_svg]:block [&_svg]:size-3.5'

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
    'box-border flex min-h-10 w-full min-w-0 shrink-0 items-center justify-start gap-2.5 rounded-full border-2 border-solid px-3.5 py-2 text-left font-outfit text-sm font-medium no-underline transition-colors sm:px-4',
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

  /** Light marketing mobile: floating card below header (Littlebird-style: plain links, no CTA fill). */
  const lightMobileDropdownRow = cn(
    'flex min-h-11 w-full min-w-0 items-center gap-2.5 rounded-xl px-5 py-2 text-left font-outfit text-stone-800 antialiased no-underline transition-colors',
    'hover:text-stone-950 active:bg-stone-100/35',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400/30 focus-visible:ring-inset focus-visible:rounded-xl',
  )
  const lightMobileDropdownRowActive = cn(
    lightMobileDropdownRow,
    'font-semibold text-stone-950 [&_svg]:text-zinc-600 dark:[&_svg]:text-zinc-400',
  )

  const headerLightMobilePill = onLightMarketing
  const mobileMenuId = headerLightMobilePill ? 'public-nav-menu-sheet' : 'public-nav-drawer'

  return (
    <div
      data-public-shell={onLightMarketing ? 'voltix-marketing-light' : 'voltix-marketing-dark'}
      className={cn(
        'flex min-h-svh min-w-0 flex-col bg-background font-outfit text-[0.9375rem] text-foreground antialiased tab:text-base',
        onLightMarketing ? 'overflow-x-visible' : 'overflow-x-clip',
      )}
    >
      <header
        className={cn(
          'sticky top-0 z-50 overflow-visible',
          headerLightMobilePill
            ? 'border-0 bg-transparent supports-[backdrop-filter]:bg-transparent desk:border-b desk:border-border desk:bg-background/90 desk:backdrop-blur-xl supports-[backdrop-filter]:desk:bg-background/80'
            : 'border-b border-border bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80',
        )}
      >
        <div
          ref={menuSurfaceRef}
          className={cn(
            'mx-auto flex w-full min-w-0 max-w-6xl',
                headerLightMobilePill
                  ? 'relative flex-col items-stretch overflow-visible px-5 pt-4 pb-2 tab:px-6 desk:flex-row desk:items-center desk:justify-between desk:gap-3 desk:overflow-visible desk:px-6 desk:py-4 desk:pt-3 desk:pb-2'
              : 'items-center justify-between gap-3 px-4 py-3 tab:px-6 tab:py-4',
          )}
        >
          <div
            className={cn(
                headerLightMobilePill
                  ? 'relative w-full min-w-0 max-w-full max-[768px]:box-border max-[768px]:px-3 desk:contents'
                : 'contents',
            )}
          >
            <div
              className={cn(
                headerLightMobilePill
                  ? 'box-border flex w-full min-w-0 max-w-full items-center justify-between gap-2 overflow-visible rounded-full border border-stone-200/80 bg-background px-5 py-3 shadow-[0_6px_24px_-8px_rgba(28,25,23,0.12),0_2px_8px_-4px_rgba(28,25,23,0.06)] tab:gap-3 tab:px-5 tab:py-3.5 desk:contents desk:w-auto desk:max-w-none desk:gap-3 desk:self-stretch desk:overflow-visible desk:border-0 desk:bg-transparent desk:p-0 desk:shadow-none desk:backdrop-blur-none'
                  : 'contents',
              )}
            >
          <Link
            to="/"
            onClick={onHomeLogoClick}
            className={cn(
              'group relative flex min-w-0 max-w-[min(100%,21rem)] shrink items-center gap-2 no-underline transition duration-200 sm:gap-2.5',
              'overflow-hidden desk:shrink-0',
              'hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'active:scale-[0.97]',
              onLightMarketing ? 'text-zinc-950 hover:text-zinc-800' : 'text-white',
              headerLightMobilePill && 'focus-visible:ring-stone-400/35 focus-visible:ring-offset-background',
            )}
            aria-label="Porpin home"
          >
            <span
              className={cn(
                'relative flex shrink-0 items-center justify-center',
                showHeaderWordmark ? 'size-12 sm:size-14' : 'size-10',
              )}
            >
              <PorpinMark className="size-full" aria-hidden />
            </span>
            {showHeaderWordmark ? (
              <PorpinWordmark
                className={cn(
                  'min-w-0 truncate',
                  '!text-[1.7rem] tab:!text-[1.95rem] sm:!text-[2.2rem]',
                )}
              />
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

          <div
            className={cn(
              'relative z-[2] flex shrink-0 items-center justify-center desk:hidden',
            )}
          >
            {headerLightMobilePill ? (
              <div className="box-border flex size-11 shrink-0 items-center justify-center rounded-full border border-stone-200/80 bg-background shadow-sm">
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className={cn(
                    'inline-flex shrink-0 items-center justify-center overflow-visible text-foreground transition',
                    'border-0 bg-transparent shadow-none [appearance:button] outline-none',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
                    menuOpen
                      ? 'min-h-11 min-w-11 items-center justify-center rounded-full text-stone-950 hover:bg-stone-200/25 focus-visible:ring-stone-400/40'
                      : 'min-h-11 min-w-11 items-center justify-center rounded-full px-1 text-stone-950 hover:bg-stone-200/25 focus-visible:ring-stone-400/40 tab:px-1.5',
                  )}
                  aria-expanded={menuOpen}
                  aria-controls={mobileMenuId}
                  aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                >
                  <PublicNavHamburgerGlyph />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className={cn(
                  'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center overflow-visible text-foreground transition',
                  'rounded-full border border-border bg-background/90 shadow-none [appearance:button] outline-none hover:bg-muted',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
                )}
                aria-expanded={menuOpen}
                aria-controls={mobileMenuId}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              >
                {menuOpen ? (
                  <X
                    className="size-5 shrink-0 text-zinc-50"
                    strokeWidth={2.25}
                    aria-hidden
                  />
                ) : (
                  <PublicNavHamburgerGlyph darkBg />
                )}
              </button>
            )}

            {menuOpen && !headerLightMobilePill ? (
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
                    className="flex flex-1 flex-col gap-1.5 overflow-visible px-3 py-2"
                    aria-label="Marketing mobile"
                  >
                    <Link
                      to="/#pricing"
                      className={onPricing ? mobileDrawerActive : mobileDrawerMuted}
                      aria-current={onPricing ? 'page' : undefined}
                      onClick={closeMenu}
                    >
                      <span className={publicDrawerIconWrapClass} aria-hidden>
                        <Sparkles
                          className={onPricing ? publicMenuIconOnSolidClass : publicMenuIconMutedClass}
                          aria-hidden
                        />
                      </span>
                      <span className="min-w-0 flex-1 leading-4">Pricing</span>
                    </Link>
                    <Link
                      to="/login"
                      className={loginNavActive ? mobileDrawerActive : mobileDrawerMuted}
                      aria-current={onLogin ? 'page' : undefined}
                      onClick={closeMenu}
                    >
                      <span className={publicDrawerIconWrapClass} aria-hidden>
                        <LogIn
                          className={loginNavActive ? publicMenuIconOnSolidClass : publicMenuIconMutedClass}
                          aria-hidden
                        />
                      </span>
                      <span className="min-w-0 flex-1 leading-4">Log in</span>
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
                      <span className={publicDrawerIconWrapClass} aria-hidden>
                        <UserPlus
                          className={
                            signupProminent ? publicMenuIconOnSolidClass : publicMenuIconMutedClass
                          }
                          aria-hidden
                        />
                      </span>
                      <span className="min-w-0 flex-1 leading-4">Sign up</span>
                    </Link>
                  </nav>
                </aside>
              </>
            ) : null}
          </div>
            </div>

            {menuOpen && headerLightMobilePill ? (
              <>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden
                  className="fixed inset-0 z-[80] bg-black/35"
                  onClick={closeMenu}
                />
                <div
                  id="public-nav-menu-sheet"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Site navigation"
                  className={cn(
                    'fixed z-[90] box-border min-w-0 overflow-visible',
                    'left-1/2 w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 tab:w-[min(26rem,calc(100vw-3rem))]',
                    'top-[calc(env(safe-area-inset-top,0px)+1rem+4.5rem+0.5rem)]',
                    'desk:hidden',
                  )}
                >
                  <div className="box-border w-full max-w-none rounded-[1.35rem] border border-stone-200/25 bg-background p-1.5 shadow-[0_10px_40px_-12px_rgba(28,25,23,0.18),0_4px_16px_-8px_rgba(28,25,23,0.08)]">
                    <nav
                      className="flex w-full min-w-0 flex-col gap-0"
                      aria-label="Marketing mobile menu"
                    >
                      <Link
                        to="/#pricing"
                        className={onPricing ? lightMobileDropdownRowActive : lightMobileDropdownRow}
                        aria-current={onPricing ? 'page' : undefined}
                        onClick={closeMenu}
                      >
                        <span className={publicMobileIconWrapClass} aria-hidden>
                          <Sparkles className={publicMenuIconMutedClass} aria-hidden />
                        </span>
                        <span className={publicMobileMenuLabelClass}>Pricing</span>
                      </Link>
                      <Link
                        to="/login"
                        className={loginNavActive ? lightMobileDropdownRowActive : lightMobileDropdownRow}
                        aria-current={onLogin ? 'page' : undefined}
                        onClick={closeMenu}
                      >
                        <span className={publicMobileIconWrapClass} aria-hidden>
                          <LogIn className={publicMenuIconMutedClass} aria-hidden />
                        </span>
                        <span className={publicMobileMenuLabelClass}>Log in</span>
                      </Link>
                      <Link
                        to="/signup"
                        className={onSignup ? lightMobileDropdownRowActive : lightMobileDropdownRow}
                        aria-current={onSignup ? 'page' : undefined}
                        onClick={closeMenu}
                      >
                        <span className={publicMobileIconWrapClass} aria-hidden>
                          <UserPlus className={publicMenuIconMutedClass} aria-hidden />
                        </span>
                        <span className={publicMobileMenuLabelClass}>Sign up</span>
                      </Link>
                    </nav>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </header>
      <main
        className={cn(
          'flex min-w-0 flex-1 flex-col',
          onLightMarketing ? 'overflow-x-visible' : 'overflow-x-clip',
          authDesktopDocumentScroll
            ? 'max-[768px]:min-h-0 max-[768px]:flex-1 desk:flex-none desk:min-h-min desk:overflow-visible'
            : 'min-h-0',
        )}
      >
        <Outlet />
      </main>
    </div>
  )
}
