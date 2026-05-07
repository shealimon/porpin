import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

import { AuthLightPageSurface } from '@/components/auth/AuthLightPageSurface'
import { PorpinMark } from '@/components/brand/PorpinMark'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatAuthError } from '@/lib/authErrors'
import {
  authFormFieldPasswordLightClass,
  authFormLabelLightClass,
  authFormPrimaryButtonLightClass,
  authLightMobileCardClass,
  authLightMobileContentInsetClass,
  authLightMobileHeaderAlignClass,
  authLightMobileHideCardLogoClass,
  authLightMobilePageShellClass,
  authLightMobileTitleRowClass,
} from '@/lib/authFormStyles'
import { resolveAuthUser, supabaseUserToAuthUser } from '@/lib/mapSupabaseUser'
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient'
import { syncBackendProfile } from '@/lib/syncBackendProfile'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

/** Wait for Supabase to parse hash/query recovery tokens before deciding the link is invalid. */
const RECOVERY_POLL_MS = 200
const RECOVERY_POLL_ATTEMPTS = 25

const authShellClass = cn(
  'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain desk:overflow-visible',
  authLightMobilePageShellClass,
  'sm:items-center sm:justify-start sm:bg-transparent',
  'sm:pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))]',
  'sm:pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pt-5 sm:justify-center sm:-translate-y-7 sm:py-12 sm:pt-12',
  'desk:justify-start desk:translate-y-0 desk:py-10 desk:pb-14 desk:pt-8',
  'touch-manipulation [-webkit-tap-highlight-color:transparent]',
)

const authCardClass = cn(
  'flex w-full flex-col gap-0 overflow-hidden bg-white py-0',
  authLightMobileCardClass,
  'sm:max-w-[380px] sm:rounded-xl sm:border sm:border-zinc-200 sm:shadow-sm lg:max-w-[440px]',
)

const authHeaderClass = cn(
  'flex flex-col items-center gap-3 border-b border-zinc-100 text-center sm:gap-4 lg:gap-5',
  authLightMobileHeaderAlignClass,
  authLightMobileContentInsetClass,
  'phone:gap-3 phone:border-zinc-100 phone:pb-5 phone:pt-6',
  'sm:px-8 sm:pb-6 sm:pt-10 lg:pb-7 lg:pt-11',
)

const authContentClass = cn(
  'flex flex-1 flex-col pb-0 sm:flex-none',
  authLightMobileContentInsetClass,
  'phone:pb-1 phone:pt-4',
  'sm:px-8 sm:pt-4',
)

const authFooterClass = cn(
  'mt-auto flex flex-col gap-0 border-0 bg-transparent sm:mt-0',
  authLightMobileContentInsetClass,
  'phone:border-t phone:border-zinc-100 phone:bg-white phone:pb-[max(1rem,env(safe-area-inset-bottom))] phone:pt-5',
  'sm:px-8 sm:pb-8 sm:pt-5',
)

const passwordInputMobileClass = cn(
  authFormFieldPasswordLightClass,
  'phone:h-14 phone:min-h-14 phone:rounded-xl phone:border-zinc-200 phone:px-4 phone:text-[1.0625rem] phone:shadow-none',
)

const cardTitleClass = cn(
  'flex w-full flex-wrap items-center justify-center gap-2.5 font-display text-[1.5rem] font-semibold !leading-snug tracking-tight text-zinc-950 sm:gap-2.5 sm:text-2xl sm:font-normal lg:gap-3 lg:text-[1.75rem]',
  authLightMobileTitleRowClass,
)

const sparklesClass =
  'size-[1.25rem] shrink-0 text-zinc-400 sm:size-[1.3125rem] lg:size-[1.4375rem]'

function AuthLogoLink() {
  return (
    <Link
      to="/"
      aria-label="Porpin home"
      className={cn(
        'group flex items-center justify-center text-zinc-900 no-underline transition-opacity hover:opacity-85',
        authLightMobileHideCardLogoClass,
      )}
    >
      <span
        className="flex size-[3.125rem] shrink-0 items-center justify-center transition duration-200 group-hover:opacity-90 sm:size-12 lg:size-[3.625rem]"
        aria-hidden
      >
        <PorpinMark className="size-full text-zinc-900" aria-hidden />
      </span>
    </Link>
  )
}

function AuthLegalNote() {
  return (
    <p className="mt-4 max-w-none text-center text-[0.75rem] leading-relaxed tracking-[0.01em] text-zinc-500 sm:mt-6 sm:max-w-[26rem] sm:text-xs">
      By continuing you agree to our{' '}
      <a
        href="#"
        className="text-zinc-600 underline decoration-zinc-300 underline-offset-2 transition hover:text-zinc-800"
        onClick={(e) => e.preventDefault()}
      >
        Terms
      </a>{' '}
      and{' '}
      <a
        href="#"
        className="text-zinc-600 underline decoration-zinc-300 underline-offset-2 transition hover:text-zinc-800"
        onClick={(e) => e.preventDefault()}
      >
        Privacy Policy
      </a>
      .
    </p>
  )
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setChecked(true)
      setSessionReady(false)
      return
    }

    let cancelled = false
    let found = false

    const markFound = () => {
      if (found || cancelled) return
      found = true
      setSessionReady(true)
      setChecked(true)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session || cancelled) return
      if (
        event === 'PASSWORD_RECOVERY' ||
        event === 'SIGNED_IN' ||
        event === 'INITIAL_SESSION'
      ) {
        markFound()
      }
    })

    void (async () => {
      for (let i = 0; i < RECOVERY_POLL_ATTEMPTS && !found && !cancelled; i++) {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (session) {
          markFound()
          break
        }
        await new Promise((r) => setTimeout(r, RECOVERY_POLL_MS))
      }
      if (!cancelled && !found) {
        setSessionReady(false)
        setChecked(true)
      }
    })()

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSupabaseConfigured()) {
      toast.error('Supabase is not configured.')
      return
    }
    if (password.length < 8) {
      toast.error('Use at least 8 characters.')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const { data, error } = await supabase.auth.updateUser({ password })
      if (error) {
        toast.error(formatAuthError(error))
        return
      }
      if (data.user) {
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData.session?.user) {
          const u = await resolveAuthUser(supabase, sessionData.session.user)
          setSession(sessionData.session.access_token, supabaseUserToAuthUser(u))
          await syncBackendProfile()
        }
      }
      toast.success('New password saved — opening your workspace.', {
        duration: 5000,
      })
      navigate('/app/upload', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  if (!checked) {
    return (
      <AuthLightPageSurface>
        <div className={authShellClass}>
          <Card className={authCardClass}>
            <CardHeader className={authHeaderClass}>
              <AuthLogoLink />
              <CardTitle className={cardTitleClass}>
                <Sparkles className={sparklesClass} strokeWidth={2} aria-hidden />
                Loading…
              </CardTitle>
              <p className="mx-auto w-full max-w-[22rem] text-center text-[0.9375rem] leading-relaxed text-zinc-500 phone:mx-0 phone:max-w-none phone:text-left sm:max-w-none sm:text-sm sm:text-zinc-600">
                Please wait a moment.
              </p>
            </CardHeader>
            <CardContent className={cn(authContentClass, 'items-center justify-center pb-6')}>
              <Loader2 className="size-8 animate-spin text-zinc-400" aria-hidden />
            </CardContent>
            <CardFooter className={authFooterClass}>
              <p className="text-center text-[0.9375rem] leading-snug text-zinc-600 sm:text-sm">
                <Link
                  to="/login"
                  className="font-semibold text-zinc-900 no-underline underline-offset-4 transition hover:underline active:opacity-80"
                >
                  Back to sign in
                </Link>
              </p>
              <AuthLegalNote />
            </CardFooter>
          </Card>
        </div>
      </AuthLightPageSurface>
    )
  }

  if (!isSupabaseConfigured()) {
    return (
      <AuthLightPageSurface>
        <div className={authShellClass}>
          <Card className={authCardClass}>
            <CardHeader className={authHeaderClass}>
              <AuthLogoLink />
              <CardTitle className={cardTitleClass}>
                <Sparkles className={sparklesClass} strokeWidth={2} aria-hidden />
                Supabase is not configured
              </CardTitle>
              <p className="mx-auto w-full max-w-[22rem] text-center text-[0.9375rem] leading-relaxed text-zinc-500 phone:mx-0 phone:max-w-none phone:text-left sm:max-w-none sm:text-sm sm:text-zinc-600">
                Supabase env vars are missing. Add them to{' '}
                <span className="font-mono text-zinc-700">frontend/.env</span>.
              </p>
            </CardHeader>
            <CardFooter className={authFooterClass}>
              <p className="text-center text-[0.9375rem] leading-snug text-zinc-600 sm:text-sm">
                <Link
                  to="/login"
                  className="font-semibold text-zinc-900 no-underline underline-offset-4 transition hover:underline active:opacity-80"
                >
                  Back to sign in
                </Link>
              </p>
              <AuthLegalNote />
            </CardFooter>
          </Card>
        </div>
      </AuthLightPageSurface>
    )
  }

  if (!sessionReady) {
    return (
      <AuthLightPageSurface>
        <div className={authShellClass}>
          <Card className={authCardClass}>
            <CardHeader className={authHeaderClass}>
              <AuthLogoLink />
              <CardTitle className={cardTitleClass}>
                <Sparkles className={sparklesClass} strokeWidth={2} aria-hidden />
                Link expired or invalid
              </CardTitle>
              <p className="mx-auto w-full max-w-[22rem] text-center text-[0.9375rem] leading-relaxed text-zinc-500 phone:mx-0 phone:max-w-none phone:text-left sm:max-w-none sm:text-sm sm:text-zinc-600">
                Request a new reset link from the forgot password page.
              </p>
            </CardHeader>
            <CardContent className={authContentClass}>
              <p className="text-sm leading-relaxed text-zinc-600 phone:text-left sm:text-sm">
                Open the link from your email in this browser. If you already reset your password,
                sign in normally.
              </p>
            </CardContent>
            <CardFooter className={authFooterClass}>
              <p className="text-center text-[0.9375rem] leading-snug text-zinc-600 sm:text-sm">
                <Link
                  to="/forgot-password"
                  className="font-semibold text-zinc-900 no-underline underline-offset-4 transition hover:underline active:opacity-80"
                >
                  Forgot password
                </Link>
                <span className="text-zinc-400"> · </span>
                <Link
                  to="/login"
                  className="font-semibold text-zinc-900 no-underline underline-offset-4 transition hover:underline active:opacity-80"
                >
                  Sign in
                </Link>
              </p>
              <AuthLegalNote />
            </CardFooter>
          </Card>
        </div>
      </AuthLightPageSurface>
    )
  }

  return (
    <AuthLightPageSurface>
      <div className={authShellClass}>
        <Card className={authCardClass}>
          <CardHeader className={authHeaderClass}>
            <AuthLogoLink />
            <CardTitle className={cardTitleClass}>
              <Sparkles className={sparklesClass} strokeWidth={2} aria-hidden />
              Choose a new password
            </CardTitle>
            <p className="mx-auto w-full max-w-[22rem] text-center text-[0.9375rem] leading-relaxed text-zinc-500 phone:mx-0 phone:max-w-none phone:text-left sm:max-w-none sm:text-sm sm:text-zinc-600">
              Use at least 8 characters for a strong password.
            </p>
          </CardHeader>

          <CardContent className={authContentClass}>
            <form onSubmit={onSubmit} className="min-w-0 space-y-5 sm:space-y-5">
              <div className="grid min-w-0 gap-2 sm:gap-2">
                <Label htmlFor="reset-password" className={cn(authFormLabelLightClass, 'phone:text-zinc-600')}>
                  New password
                </Label>
                <Input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  className={passwordInputMobileClass}
                />
              </div>

              <div className="grid min-w-0 gap-2 sm:gap-2">
                <Label htmlFor="reset-confirm" className={cn(authFormLabelLightClass, 'phone:text-zinc-600')}>
                  Confirm password
                </Label>
                <Input
                  id="reset-confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  value={confirm}
                  onChange={(ev) => setConfirm(ev.target.value)}
                  className={passwordInputMobileClass}
                />
              </div>

              <Button type="submit" disabled={busy} className={authFormPrimaryButtonLightClass}>
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  'Update password'
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className={authFooterClass}>
            <p className="text-center text-[0.9375rem] leading-snug text-zinc-600 sm:text-sm">
              <Link
                to="/login"
                className="font-semibold text-zinc-900 no-underline underline-offset-4 transition hover:underline active:opacity-80"
              >
                Back to sign in
              </Link>
            </p>
            <AuthLegalNote />
          </CardFooter>
        </Card>
      </div>
    </AuthLightPageSurface>
  )
}
