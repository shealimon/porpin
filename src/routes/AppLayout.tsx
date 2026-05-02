import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  CreditCard,
  Gift,
  History,
  LogOut,
  Menu,
  Sparkles,
  UserRound,
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
  /** Edge-to-edge, app-like chrome on phones; desktop stays centered canvas + card rhythm. */
  const isAccountSettingsRoute = /^\/app\/settings(\/|$)/.test(location.pathname)
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
    'flex w-full cursor-pointer items-center gap-2 rounded-md bg-transparent px-2 py-2 text-left font-outfit text-[0.9375rem] font-medium leading-5 text-zinc-950 no-underline outline-none hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-2 focus-visible:ring-zinc-900/15 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-zinc-50 dark:hover:bg-transparent dark:focus-visible:bg-transparent dark:focus-visible:ring-zinc-100/20 dark:focus-visible:ring-offset-zinc-950'
  const deskMenuIconWrapClass =
    'inline-flex size-4 shrink-0 items-center justify-center text-zinc-500 dark:text-zinc-400 [&_svg]:block [&_svg]:size-3.5'

  /** Icon slots: fixed box + centered SVG so labels align across Lucide glyphs. */
  const appMobileSheetIconWrapClass =
    'inline-flex size-[1.375rem] shrink-0 items-center justify-center text-zinc-500 dark:text-zinc-400 [&_svg]:block [&_svg]:size-[1.125rem]'
  /** Match desktop `menuRowClass` typography (Outfit 15px / medium / leading-5). */
  const appMobileSheetLabelClass =
    'min-w-0 flex-1 font-outfit text-[0.9375rem] font-medium leading-5 text-inherit'
  const appMobileSheetRowClass = cn(
    'flex min-h-11 w-full min-w-0 items-center gap-2.5 rounded-xl px-3.5 py-2 text-left font-outfit text-[0.9375rem] font-medium leading-5 text-zinc-900 no-underline transition-colors antialiased',
    'hover:bg-zinc-100/70 active:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-800/55 dark:active:bg-zinc-800/75',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:ring-inset focus-visible:rounded-xl dark:focus-visible:ring-zinc-100/25',
  )
  const appMobileSheetRowButtonClass = cn(
    appMobileSheetRowClass,
    'cursor-pointer border-0 bg-transparent shadow-none [appearance:button]',
  )

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
    <div
      className={cn(
        'manus-app-shell flex h-svh max-h-svh min-h-0 flex-col overflow-hidden font-sans text-[0.9375rem] antialiased tab:text-base',
        isUploadRoute && 'manus-app-shell--upload-chat-mobile w-full max-w-full min-w-0',
      )}
    >
      <header
        className={cn(
          'relative z-[110] flex min-h-[3.25rem] shrink-0 items-center justify-between gap-2 border-b border-sidebar-border bg-[var(--manus-canvas)]',
          /* Match main pane: same horizontal gutter on both sides (incl. sm:px-6 like `app-main-scroll`) */
          'px-[max(1rem,env(safe-area-inset-left),env(safe-area-inset-right))] pt-[max(0.5rem,env(safe-area-inset-top,0px))]',
          'sm:px-6',
          isUploadRoute &&
            'upload-chat-mobile-header border-zinc-200/85 desk:border-sidebar-border desk:bg-[#f9f7f2] dark:desk:bg-zinc-900',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center">
          <Link
            to="/app/upload"
            aria-label="Porpin home — go to upload"
            title="Porpin"
            className={cn(
              'group inline-flex h-11 min-h-[44px] max-w-[min(100%,20rem)] shrink-0 items-center gap-2 rounded-full px-2 py-1 no-underline visited:no-underline transition-colors',
              'text-zinc-900 hover:bg-zinc-100/90 dark:text-zinc-50 dark:hover:bg-zinc-800/80',
              'desk:h-9 desk:min-h-0 desk:gap-2 desk:px-2.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/25 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--manus-canvas)]',
              'dark:focus-visible:ring-zinc-100/30 dark:focus-visible:ring-offset-zinc-950',
            )}
          >
            <span className="inline-flex size-10 shrink-0 items-center justify-center desk:size-9">
              <PorpinMark className="size-full" aria-hidden />
            </span>
            <PorpinWordmark className="truncate" />
          </Link>
        </div>

        <div
          ref={menuSurfaceRef}
          className={cn(
            /* Match logo side: a little air from top + from the wordmark (inline-start / “left” in LTR) */
            'relative flex items-center gap-1 py-0.5 ms-2 sm:ms-2.5 sm:py-1',
            isUploadRoute
              ? 'min-h-[44px] flex-1 justify-end gap-1 desk:min-h-0 desk:flex-initial desk:shrink-0 desk:justify-end'
              : 'shrink-0',
          )}
        >
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
            aria-controls="app-nav-mobile-menu"
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
            aria-label="Profile menu"
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
                className="fixed inset-0 z-[198] bg-black/35 desk:hidden"
                onClick={closeMenu}
              />
              <div
                id="app-nav-mobile-menu"
                role="dialog"
                aria-modal="true"
                aria-label="App navigation"
                className={cn(
                  'fixed z-[200] box-border min-w-0 overflow-visible desk:hidden',
                  'left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))] w-auto max-w-none',
                  'top-[calc(env(safe-area-inset-top,0px)+3.25rem+0.5rem)]',
                )}
              >
                <div
                  className={cn(
                    'box-border w-full rounded-[1.35rem] border border-zinc-200/90 bg-white p-1.5 shadow-[0_10px_40px_-12px_rgba(22,22,23,0.16),0_4px_16px_-8px_rgba(22,22,23,0.08)]',
                    'dark:border-zinc-700 dark:bg-zinc-950 dark:shadow-black/35',
                  )}
                >
                  <div
                    className="flex items-center gap-2 rounded-xl px-2.5 py-2"
                    role="none"
                  >
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
                  <div
                    className="mx-2 mb-0.5 h-px bg-zinc-200 dark:bg-zinc-800"
                    role="separator"
                  />
                  <nav
                    className="flex w-full min-w-0 flex-col gap-0"
                    aria-label="App"
                  >
                    <Link
                      role="menuitem"
                      to="/#pricing"
                      className={appMobileSheetRowClass}
                      onClick={onMenuPricingClick}
                    >
                      <span className={appMobileSheetIconWrapClass} aria-hidden>
                        <Sparkles aria-hidden />
                      </span>
                      <span className={appMobileSheetLabelClass}>Upgrade Plan</span>
                    </Link>
                    <div
                      className="mx-2 my-0.5 h-px bg-zinc-200 dark:bg-zinc-800"
                      role="separator"
                    />
                    <Link
                      role="menuitem"
                      to="/app/settings"
                      className={appMobileSheetRowClass}
                      onClick={onMenuLinkClick('/app/settings')}
                    >
                      <span className={appMobileSheetIconWrapClass} aria-hidden>
                        <UserRound aria-hidden />
                      </span>
                      <span className={appMobileSheetLabelClass}>Profile</span>
                    </Link>
                    <Link
                      role="menuitem"
                      to="/app/billing"
                      className={appMobileSheetRowClass}
                      onClick={onMenuLinkClick('/app/billing')}
                    >
                      <span className={appMobileSheetIconWrapClass} aria-hidden>
                        <CreditCard aria-hidden />
                      </span>
                      <span className={appMobileSheetLabelClass}>Billing</span>
                    </Link>
                    <Link
                      role="menuitem"
                      to="/app/history"
                      className={appMobileSheetRowClass}
                      onClick={onMenuLinkClick('/app/history')}
                    >
                      <span className={appMobileSheetIconWrapClass} aria-hidden>
                        <History aria-hidden />
                      </span>
                      <span className={appMobileSheetLabelClass}>History</span>
                    </Link>
                    <Link
                      role="menuitem"
                      to="/app/invite"
                      className={appMobileSheetRowClass}
                      onClick={onMenuLinkClick('/app/invite')}
                    >
                      <span className={appMobileSheetIconWrapClass} aria-hidden>
                        <Gift aria-hidden />
                      </span>
                      <span className={appMobileSheetLabelClass}>Invite friends</span>
                    </Link>
                    <div
                      className="mx-2 my-0.5 h-px bg-zinc-200 dark:bg-zinc-800"
                      role="separator"
                    />
                    <div
                      role="menuitem"
                      tabIndex={0}
                      className={appMobileSheetRowButtonClass}
                      onClick={onLogout}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          void onLogout()
                        }
                      }}
                    >
                      <span className={appMobileSheetIconWrapClass} aria-hidden>
                        <LogOut aria-hidden />
                      </span>
                      <span className={appMobileSheetLabelClass}>Log out</span>
                    </div>
                  </nav>
                </div>
              </div>
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
                  <span className={deskMenuIconWrapClass} aria-hidden>
                    <Sparkles aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 leading-5">Upgrade Plan</span>
                </Link>
                <div className="mx-1.5 my-1 h-px bg-zinc-200 dark:bg-zinc-800" role="separator" />
                <Link
                  role="menuitem"
                  to="/app/settings"
                  className={menuRowClass}
                  onClick={onMenuLinkClick('/app/settings')}
                >
                  <span className={deskMenuIconWrapClass} aria-hidden>
                    <UserRound aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 leading-5">Profile</span>
                </Link>
                <Link role="menuitem" to="/app/billing" className={menuRowClass} onClick={onMenuLinkClick('/app/billing')}>
                  <span className={deskMenuIconWrapClass} aria-hidden>
                    <CreditCard aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 leading-5">Billing</span>
                </Link>
                <Link role="menuitem" to="/app/history" className={menuRowClass} onClick={onMenuLinkClick('/app/history')}>
                  <span className={deskMenuIconWrapClass} aria-hidden>
                    <History aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 leading-5">History</span>
                </Link>
                <Link role="menuitem" to="/app/invite" className={menuRowClass} onClick={onMenuLinkClick('/app/invite')}>
                  <span className={deskMenuIconWrapClass} aria-hidden>
                    <Gift aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 leading-5">Invite friends</span>
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
                  <span className={deskMenuIconWrapClass} aria-hidden>
                    <LogOut aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 leading-5">Log out</span>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </header>
      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--manus-canvas)]',
          /* Upload: inset the scroll pane slightly so card borders aren’t flush with this clip box (flex subpixel + overflow:hidden). */
          isUploadRoute && [
            'px-px max-[768px]:px-0.5',
            /* Desktop: same surface as header + main scroll (avoids canvas peeking at subpixel gaps). */
            'desk:bg-[#f9f7f2] dark:desk:bg-zinc-900',
          ],
        )}
      >
        <div
          className={cn(
            'app-main-scroll font-outfit mx-auto flex min-h-0 min-w-0 w-full flex-1 flex-col overscroll-y-contain text-zinc-900 antialiased dark:text-zinc-50',
            /* Settings + upload home: omit overflow-x-hidden — it clips rounded borders/right edge on narrow viewports when paired with scrollbar + subpixel rounding. Content is width-stable (min-w-0 + break-*). */
            isAccountSettingsRoute || isUploadRoute ? 'overflow-y-auto' : 'overflow-x-hidden overflow-y-auto',
            /* Upload / Account settings: full-width on small screens */
            isUploadRoute || isAccountSettingsRoute ? 'max-w-none' : 'max-w-5xl',
            isAccountSettingsRoute && [
              'desk:max-w-5xl desk:bg-transparent',
              /* Symmetric scrollbar gutter — same class used on upload home so composer borders aren’t clipped on narrow viewports. */
              'app-main-scroll--settings-balanced',
            ],
            isUploadRoute && [
              'app-main-scroll--settings-balanced',
              /* Upload home: desktop pane tint so the hero + composer sit on a defined surface (mobile keeps shell --manus-canvas). */
              'desk:bg-[#f9f7f2] dark:desk:bg-zinc-900',
            ],
            isHiddenScrollbarMainRoute &&
              cn(
                'app-main-scroll--scrollbar-none',
                !isAccountSettingsRoute && !isUploadRoute && '[scrollbar-gutter:auto]',
                '[scrollbar-width:none] [-ms-overflow-style:none]',
                '[&::-webkit-scrollbar]:hidden',
              ),
            /* Account settings: same surface as header + shell (--manus-canvas) — avoids white/canvas/zinc bands */
            isAccountSettingsRoute &&
              cn(
                'bg-[var(--manus-canvas)] pb-[max(1.25rem,env(safe-area-inset-bottom))]',
                /* Tablet→desk: shell horizontal inset. Phone (≤480): shell has no horizontal padding — SettingsPage applies inset to the form fields + header so controls own the gutter. */
                'pl-[max(1.375rem,env(safe-area-inset-left))] pr-[max(1.375rem,env(safe-area-inset-right))]',
                'phone:pl-0 phone:pr-0',
                'py-4 tab:py-6',
                /* Restore shared gutter with other app pages on desktop */
                'desk:px-[max(1rem,env(safe-area-inset-left),env(safe-area-inset-right))] desk:sm:px-6 desk:py-6 desk:sm:py-8',
              ),
            !isAccountSettingsRoute &&
              cn(
                'px-[max(1rem,env(safe-area-inset-left),env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))]',
                'sm:px-6',
              ),
            isUploadRoute
              ? 'pt-4 pb-3 sm:pt-5 sm:pb-4 desk:pt-7 desk:pb-6 desk:sm:pt-9 desk:sm:pb-8'
              : null,
            !isUploadRoute && !isAccountSettingsRoute ? 'py-6 sm:py-8' : null,
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
