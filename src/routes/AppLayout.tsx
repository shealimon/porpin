import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  CreditCard,
  Gift,
  History,
  LogOut,
  Menu,
  Sparkles,
  X,
} from 'lucide-react'

import { PorpinMark } from '@/components/brand/PorpinMark'
import { PorpinWordmark } from '@/components/brand/PorpinWordmark'
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient'
import { qk } from '@/lib/queryKeys'
import { queryClient } from '@/lib/queryClient'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useBillingStore } from '@/stores/billingStore'
import { displayNameFromNameParts, getStoredUserName } from '@/utils/greeting'

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const email = user?.email
  const avatarUrl = user?.avatarUrl
  const clearSession = useAuthStore((s) => s.clearSession)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuSurfaceRef = useRef<HTMLDivElement>(null)

  const displayName = useMemo(() => {
    const stored = getStoredUserName()
    if (stored) return stored
    const fromAccount = displayNameFromNameParts(user?.firstName, user?.lastName)
    if (fromAccount) return fromAccount
    const local = email?.split('@')[0]?.trim()
    if (local) return local
    return 'User'
  }, [email, user?.firstName, user?.lastName, location.pathname])

  const avatarFallbackLetter = useMemo(() => {
    const fn = user?.firstName?.trim()
    if (fn) return fn[0]!.toUpperCase()
    const ln = user?.lastName?.trim()
    if (ln) return ln[0]!.toUpperCase()
    return email?.trim()?.[0]?.toUpperCase() ?? '?'
  }, [user?.firstName, user?.lastName, email])

  /** Inner main pane scrolls; scrollbar visually hidden on these routes (all breakpoints / “normal” desktop included). Account, billing, history, invite, upload. */
  const path =
    location.pathname.length > 1 && location.pathname.endsWith('/')
      ? location.pathname.slice(0, -1)
      : location.pathname
  const isUploadRoute = path === '/app/upload'
  const isHiddenScrollbarMainRoute =
    /^\/app\/(settings|billing|history|invite)(\/|$)/.test(location.pathname) || isUploadRoute

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

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

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const onLogout = async () => {
    setMenuOpen(false)
    useBillingStore.getState().resetActiveUserBilling()
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut()
    }
    clearSession()
    void queryClient.removeQueries({ queryKey: qk.me.all })
    navigate('/login', { replace: true })
  }

  const menuRowClass =
    'flex w-full cursor-pointer items-center gap-2 rounded-md bg-transparent px-2 py-2 text-left text-sm font-normal text-zinc-950 no-underline outline-none hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-2 focus-visible:ring-zinc-900/15 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-zinc-50 dark:hover:bg-transparent dark:focus-visible:bg-transparent dark:focus-visible:ring-zinc-100/20 dark:focus-visible:ring-offset-zinc-950'

  const menuRowMobileClass =
    'flex w-full min-h-10 cursor-pointer items-center gap-2 rounded-md bg-transparent px-2 py-2 text-left text-sm font-normal leading-snug text-zinc-950 no-underline outline-none active:bg-zinc-100 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-900/15 focus-visible:ring-offset-2 dark:text-zinc-50 dark:hover:bg-zinc-800/60 dark:active:bg-zinc-800/80 dark:focus-visible:ring-zinc-100/20'

  const closeMenu = () => setMenuOpen(false)

  /** Programmatic navigation so the menu can close without unmounting the `<Link>` before RR handles the click. */
  const onMenuLinkClick = useCallback(
    (to: string) => (e: MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
      e.preventDefault()
      navigate(to)
      setMenuOpen(false)
    },
    [navigate],
  )

  const onMenuPricingClick = useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    navigate({ pathname: '/', hash: 'pricing' })
    setMenuOpen(false)
  }, [navigate])

  return (
    <div className="manus-app-shell flex h-svh max-h-svh min-h-0 flex-col overflow-hidden font-sans text-[0.9375rem] antialiased tab:text-base">
      <header
        className={cn(
          'relative z-[110] flex min-h-[3.25rem] shrink-0 items-center justify-between gap-2 border-b border-sidebar-border bg-[var(--manus-canvas)]',
          /* Match main pane: same horizontal gutter on both sides (avoids lopsided header on mobile) */
          'px-[max(1rem,env(safe-area-inset-left),env(safe-area-inset-right))] pt-[max(0px,env(safe-area-inset-top))]',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center">
          <Link
            to="/app/upload"
            aria-label="Porpin home — go to upload"
            title="Porpin"
            className={cn(
              'group inline-flex h-11 min-h-[44px] max-w-[min(100%,14rem)] shrink-0 items-center gap-2 rounded-full px-2 py-1 no-underline visited:no-underline transition-colors',
              'text-zinc-900 hover:bg-zinc-100/90 dark:text-zinc-50 dark:hover:bg-zinc-800/80',
              'desk:h-9 desk:min-h-0 desk:gap-2 desk:px-2.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--manus-canvas)]',
              'dark:focus-visible:ring-zinc-100/30 dark:focus-visible:ring-offset-zinc-950',
            )}
          >
            <span className="inline-flex size-9 shrink-0 items-center justify-center text-zinc-900 dark:text-zinc-50 desk:size-8">
              <PorpinMark className="size-full" aria-hidden />
            </span>
            <PorpinWordmark className="truncate" />
          </Link>
        </div>
        <div ref={menuSurfaceRef} className="relative flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className={cn(
              'inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-transparent text-zinc-700 transition',
              'hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--manus-canvas)]',
              'dark:text-zinc-200 dark:hover:bg-zinc-800/80 dark:focus-visible:ring-zinc-100/30 dark:focus-visible:ring-offset-zinc-950',
              'desk:hidden',
              menuOpen && 'bg-zinc-100 dark:bg-zinc-800/80',
            )}
            aria-expanded={menuOpen}
            aria-controls="app-nav-drawer"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X className="size-5 shrink-0" aria-hidden /> : <Menu className="size-5 shrink-0" aria-hidden />}
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className={cn(
              'hidden size-11 items-center justify-center overflow-visible rounded-full p-0 transition',
              'desk:inline-flex desk:size-10',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--manus-canvas)]',
              'dark:focus-visible:ring-zinc-100/30 dark:focus-visible:ring-offset-zinc-950',
              menuOpen &&
                'ring-2 ring-zinc-900/20 ring-offset-2 ring-offset-[var(--manus-canvas)] dark:ring-zinc-100/25 dark:ring-offset-zinc-950',
            )}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Account menu"
          >
            <span className="relative inline-flex size-10 shrink-0 items-center justify-center">
              <Avatar
                size="default"
                className={cn(
                  'border border-zinc-200 bg-white text-zinc-800 shadow-sm',
                  'dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100',
                )}
              >
                {avatarUrl ? (
                  <AvatarImage
                    key={avatarUrl}
                    src={avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                ) : null}
                <AvatarFallback className="bg-white text-sm font-semibold tabular-nums dark:bg-zinc-900">
                  {avatarFallbackLetter}
                </AvatarFallback>
              </Avatar>
              <AvatarBadge aria-hidden />
            </span>
          </button>

          {menuOpen ? (
            <>
              <button
                type="button"
                tabIndex={-1}
                aria-hidden
                className="fixed inset-0 z-[198] bg-black/45 desk:hidden"
                onClick={closeMenu}
              />
              <aside
                id="app-nav-drawer"
                role="dialog"
                aria-modal="true"
                aria-label="App navigation"
                className={cn(
                  'fixed right-0 top-0 z-[200] flex h-svh max-h-dvh w-[min(17.5rem,calc(100vw-env(safe-area-inset-left)))] min-w-0 flex-col text-sm',
                  'border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-950',
                  'pt-[max(0px,env(safe-area-inset-top))] pb-[max(0px,env(safe-area-inset-bottom))]',
                  'desk:hidden',
                )}
              >
                <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
                  <p className="min-w-0 truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">Menu</p>
                  <button
                    type="button"
                    onClick={closeMenu}
                    className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/80"
                    aria-label="Close menu"
                  >
                    <X className="size-[1.125rem]" aria-hidden />
                  </button>
                </div>
                <div className="flex items-center gap-2.5 border-b border-zinc-200 px-3 py-3 dark:border-zinc-800" role="none">
                  <Avatar
                    size="sm"
                    className={cn(
                      'size-9 shrink-0 rounded-md border border-zinc-200 bg-white shadow-sm',
                      'dark:border-zinc-700 dark:bg-zinc-900',
                    )}
                    aria-hidden
                  >
                    {avatarUrl ? (
                      <AvatarImage
                        key={avatarUrl}
                        src={avatarUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                    <AvatarFallback className="rounded-md bg-white text-xs font-semibold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                      {avatarFallbackLetter}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-semibold leading-tight text-zinc-950 dark:text-zinc-50">
                      {displayName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{email ?? '—'}</p>
                  </div>
                </div>
                <nav
                  className="flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto overscroll-y-contain p-1.5"
                  aria-label="App"
                >
                  <Link role="menuitem" to="/#pricing" className={menuRowMobileClass} onClick={onMenuPricingClick}>
                    <Sparkles className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                    <span>Upgrade Plan</span>
                  </Link>
                  <div className="mx-1.5 my-1.5 h-px bg-zinc-200 dark:bg-zinc-800" role="separator" />
                  <Link
                    role="menuitem"
                    to="/app/settings"
                    className={menuRowMobileClass}
                    onClick={onMenuLinkClick('/app/settings')}
                  >
                    <BadgeCheck className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                    <span>Account</span>
                  </Link>
                  <Link
                    role="menuitem"
                    to="/app/billing"
                    className={menuRowMobileClass}
                    onClick={onMenuLinkClick('/app/billing')}
                  >
                    <CreditCard className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                    <span>Billing</span>
                  </Link>
                  <Link
                    role="menuitem"
                    to="/app/history"
                    className={menuRowMobileClass}
                    onClick={onMenuLinkClick('/app/history')}
                  >
                    <History className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                    <span>History</span>
                  </Link>
                  <Link
                    role="menuitem"
                    to="/app/invite"
                    className={menuRowMobileClass}
                    onClick={onMenuLinkClick('/app/invite')}
                  >
                    <Gift className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                    <span>Invite friends</span>
                  </Link>
                  <div className="mx-1.5 my-1.5 h-px bg-zinc-200 dark:bg-zinc-800" role="separator" />
                  <div
                    role="menuitem"
                    tabIndex={0}
                    className={menuRowMobileClass}
                    onClick={onLogout}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        void onLogout()
                      }
                    }}
                  >
                    <LogOut className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                    <span>Log out</span>
                  </div>
                </nav>
              </aside>
              <div
                role="menu"
                aria-orientation="vertical"
                className={cn(
                  'absolute right-0 top-full z-[200] mt-2 hidden w-[min(14rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] origin-top-right text-sm desk:block',
                  'rounded-xl border border-zinc-200/90 bg-white p-1.5',
                  'shadow-[0_10px_38px_-10px_rgba(22,22,23,0.25),0_10px_20px_-15px_rgba(22,22,23,0.12)]',
                  'dark:border-zinc-700 dark:bg-zinc-950 dark:shadow-black/40',
                )}
              >
                <div className="flex items-center gap-2.5 px-1.5 py-2" role="none">
                  <Avatar
                    size="sm"
                    className={cn(
                      'shrink-0 rounded-md border border-zinc-200 bg-white shadow-sm',
                      'dark:border-zinc-700 dark:bg-zinc-900',
                    )}
                    aria-hidden
                  >
                    {avatarUrl ? (
                      <AvatarImage
                        key={avatarUrl}
                        src={avatarUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                    <AvatarFallback className="rounded-md bg-white text-[11px] font-semibold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                      {avatarFallbackLetter}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-semibold leading-none tracking-tight text-zinc-950 dark:text-zinc-50">
                      {displayName}
                    </p>
                    <p className="mt-1 truncate text-xs font-normal text-zinc-500 dark:text-zinc-400">{email ?? '—'}</p>
                  </div>
                </div>
                <div className="mx-1.5 h-px bg-zinc-200 dark:bg-zinc-800" role="separator" />
                <Link role="menuitem" to="/#pricing" className={menuRowClass} onClick={onMenuPricingClick}>
                  <Sparkles className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                  <span>Upgrade Plan</span>
                </Link>
                <div className="mx-1.5 my-1 h-px bg-zinc-200 dark:bg-zinc-800" role="separator" />
                <Link
                  role="menuitem"
                  to="/app/settings"
                  className={menuRowClass}
                  onClick={onMenuLinkClick('/app/settings')}
                >
                  <BadgeCheck className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                  <span>Account</span>
                </Link>
                <Link role="menuitem" to="/app/billing" className={menuRowClass} onClick={onMenuLinkClick('/app/billing')}>
                  <CreditCard className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                  <span>Billing</span>
                </Link>
                <Link role="menuitem" to="/app/history" className={menuRowClass} onClick={onMenuLinkClick('/app/history')}>
                  <History className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                  <span>History</span>
                </Link>
                <Link role="menuitem" to="/app/invite" className={menuRowClass} onClick={onMenuLinkClick('/app/invite')}>
                  <Gift className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                  <span>Invite friends</span>
                </Link>
                <div className="mx-1.5 my-1 h-px bg-zinc-200 dark:bg-zinc-800" role="separator" />
                <div
                  role="menuitem"
                  tabIndex={0}
                  className={menuRowClass}
                  onClick={onLogout}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onLogout()
                    }
                  }}
                >
                  <LogOut className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                  <span>Log out</span>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--manus-canvas)]">
        <div
          className={cn(
            'app-main-scroll font-outfit mx-auto flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain py-6 text-zinc-900 antialiased dark:text-zinc-50',
            /* Upload: full-width scroll area (matches narrow viewport); other routes: centered max width */
            isUploadRoute ? 'max-w-none' : 'max-w-5xl',
            isHiddenScrollbarMainRoute && [
              'app-main-scroll--scrollbar-none',
              /* Extra hide for desktop WebKit / Windows where CSS file order can still show a rail */
              '[scrollbar-gutter:auto] [scrollbar-width:none] [-ms-overflow-style:none]',
              '[&::-webkit-scrollbar]:hidden',
            ],
            /* Single px using max of both safe insets so left/right gutters match on narrow viewports */
            'px-[max(1rem,env(safe-area-inset-left),env(safe-area-inset-right))] pb-[max(1.5rem,env(safe-area-inset-bottom))]',
            'sm:px-6 sm:py-8',
          )}
          style={
            isHiddenScrollbarMainRoute
              ? { scrollbarWidth: 'none', msOverflowStyle: 'none' as const }
              : undefined
          }
        >
          <Outlet />
        </div>
      </div>
    </div>
  )
}
