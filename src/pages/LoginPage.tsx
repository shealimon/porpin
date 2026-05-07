import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Loader2, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

import { AuthLightPageSurface } from '@/components/auth/AuthLightPageSurface'
import { PorpinMark } from '@/components/brand/PorpinMark'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatAuthError } from '@/lib/authErrors'
import {
  authFormFieldCompactLightClass,
  authFormFieldPasswordLightClass,
  authFormLabelLightClass,
  authFormPrimaryButtonLightClass,
  authLightMobileCardClass,
  authLightMobileContentInsetClass,
  authLightMobileHideCardLogoClass,
  authLightMobilePageShellClass,
} from '@/lib/authFormStyles'
import { resolveAuthUser, supabaseUserToAuthUser } from '@/lib/mapSupabaseUser'
import {
  isSupabaseConfigured,
  setAuthRememberMe,
  supabase,
  supabaseConfigMissingUserMessage,
} from '@/lib/supabaseClient'
import { syncBackendProfile } from '@/lib/syncBackendProfile'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

type LoginState = { from?: string; emailJustVerified?: boolean } | null

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useAuthStore((s) => s.setSession)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [busy, setBusy] = useState(false)

  const locState = location.state as LoginState
  const from = locState?.from ?? '/app/upload'
  const authSearch = location.search
  const signupHref = authSearch ? `/signup${authSearch}` : '/signup'

  useEffect(() => {
    const st = location.state as LoginState
    if (!st?.emailJustVerified) return
    toast.success(
      'Email verified. Sign in with the email and password you used to register.',
      { duration: 6500 },
    )
    navigate('/login', {
      replace: true,
      state: st.from ? { from: st.from } : {},
    })
  }, [location.state, navigate])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSupabaseConfigured()) {
      toast.error(supabaseConfigMissingUserMessage)
      return
    }
    const em = email.trim()
    if (!em || !password) {
      toast.error('Enter your email and password.')
      return
    }
    setBusy(true)
    try {
      setAuthRememberMe(rememberMe)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: em,
        password,
      })
      if (error) {
        toast.error(formatAuthError(error))
        return
      }
      if (data.session?.user) {
        const u = await resolveAuthUser(supabase, data.user)
        setSession(data.session.access_token, supabaseUserToAuthUser(u))
        await syncBackendProfile()
        navigate(from, { replace: true })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLightPageSurface>
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain desk:overflow-visible',
          authLightMobilePageShellClass,
          /* Phone: breathe room under the public nav pill. */
          'phone:pt-4',
          'sm:items-center sm:justify-start sm:bg-transparent',
          'sm:pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))]',
          'sm:pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pt-5 sm:justify-center sm:-translate-y-7 sm:py-12 sm:pt-12',
          'desk:justify-start desk:translate-y-0 desk:py-10 desk:pb-14 desk:pt-8',
          'touch-manipulation [-webkit-tap-highlight-color:transparent]',
        )}
      >
        <Card
          className={cn(
            'flex w-full flex-col gap-0 overflow-hidden bg-white py-0',
            authLightMobileCardClass,
            'sm:max-w-[380px] sm:rounded-xl sm:border sm:border-zinc-200 sm:shadow-sm lg:max-w-[440px]',
          )}
        >
          <CardHeader
            className={cn(
              'flex flex-col items-center gap-3 border-b border-zinc-100 text-center sm:gap-4 lg:gap-5',
              authLightMobileContentInsetClass,
              'phone:gap-3 phone:border-zinc-100 phone:pb-5 phone:pt-14',
              'sm:px-8 sm:pb-6 sm:pt-10 lg:pb-7 lg:pt-11',
            )}
          >
            <Link
              to="/"
              aria-label="Porpin home"
              className={cn(
                'group flex items-center justify-center text-zinc-900 no-underline transition-opacity hover:opacity-85',
                authLightMobileHideCardLogoClass,
              )}
            >
              <span
                className="flex size-[3.25rem] shrink-0 items-center justify-center transition duration-200 group-hover:opacity-90 sm:size-12 lg:size-[3.625rem]"
                aria-hidden
              >
                <PorpinMark className="size-full text-zinc-900" aria-hidden />
              </span>
            </Link>
            <CardTitle className="flex w-full flex-wrap items-center justify-center gap-2.5 font-display text-[1.5625rem] font-semibold !leading-snug tracking-tight text-zinc-950 sm:gap-2.5 sm:text-2xl sm:font-normal lg:gap-3 lg:text-[1.75rem]">
              <Sparkles
                className="size-[1.3125rem] shrink-0 text-zinc-400 sm:size-[1.3125rem] lg:size-[1.4375rem]"
                strokeWidth={2}
                aria-hidden
              />
              Welcome back
            </CardTitle>
            <p className="mx-auto w-full max-w-none text-center text-base leading-relaxed text-zinc-500 sm:max-w-none sm:text-sm sm:text-zinc-600">
              Sign in to continue to your workspace.
            </p>
          </CardHeader>

          <CardContent
            className={cn(
              'flex flex-1 flex-col pb-0 sm:flex-none',
              authLightMobileContentInsetClass,
              'phone:pb-2 phone:pt-2',
              'sm:px-8 sm:pt-4',
            )}
          >
            <form onSubmit={onSubmit} className="min-w-0 space-y-6 sm:space-y-5">
              <div className="flex flex-col gap-4 phone:gap-1 sm:gap-5">
                <div className="grid min-w-0 gap-1.5 sm:gap-2">
                  <Label htmlFor="login-email" className={cn(authFormLabelLightClass, 'phone:text-zinc-600')}>
                    Email
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                    className={cn(
                      authFormFieldCompactLightClass,
                      'phone:h-14 phone:min-h-14 phone:rounded-xl phone:border-zinc-200 phone:px-4 phone:text-[1.0625rem] phone:shadow-none',
                    )}
                  />
                </div>
                <div className="grid min-w-0 gap-1.5 sm:gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 sm:items-end">
                    <Label htmlFor="login-password" className={cn(authFormLabelLightClass, 'phone:text-zinc-600')}>
                      Password
                    </Label>
                    <Link
                      to="/forgot-password"
                      className="-mr-2 inline-flex min-h-10 shrink-0 items-center rounded-lg px-2 py-2 text-xs font-medium text-zinc-600 no-underline transition hover:text-zinc-900 active:opacity-75 sm:-mr-0 sm:min-h-0 sm:py-0.5 sm:text-[0.7rem] sm:font-semibold sm:uppercase sm:tracking-[0.14em] sm:text-zinc-500"
                    >
                      <span className="sm:hidden">Forgot password?</span>
                      <span className="hidden sm:inline">Forgot?</span>
                    </Link>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Your password"
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    className={cn(
                      authFormFieldPasswordLightClass,
                      'phone:h-14 phone:min-h-14 phone:rounded-xl phone:border-zinc-200 phone:px-4 phone:text-[1.0625rem] phone:shadow-none',
                    )}
                  />
                </div>
              </div>
              <label
                htmlFor="login-remember"
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl text-[0.9375rem] text-zinc-600 select-none sm:min-h-0 sm:gap-2 sm:rounded-none sm:py-0 sm:text-sm',
                  'phone:min-h-[3.5rem] phone:bg-zinc-50/90 phone:px-4 phone:py-3.5 phone:text-base phone:ring-1 phone:ring-zinc-200/80',
                )}
              >
                <input
                  id="login-remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(ev) => setRememberMe(ev.target.checked)}
                  className="size-[1.125rem] shrink-0 rounded border border-zinc-300 text-zinc-900 accent-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-400/25 focus-visible:ring-offset-2 sm:size-3.5"
                />
                <span className="leading-snug">Remember me on this device</span>
              </label>
              <Button
                type="submit"
                disabled={busy}
                className={authFormPrimaryButtonLightClass}
              >
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
            <p className="mt-4 text-center text-base text-zinc-600 phone:mt-3 sm:mt-5 sm:text-sm">
              No account yet?{' '}
              <Link
                to={signupHref}
                className="font-semibold text-zinc-900 no-underline underline-offset-4 transition hover:underline active:opacity-80"
              >
                Signup
              </Link>
            </p>
          </CardContent>

          <CardFooter
            className={cn(
              'mt-auto flex flex-col gap-0 border-0 bg-transparent sm:mt-0',
              authLightMobileContentInsetClass,
              'phone:border-t phone:border-zinc-100 phone:bg-white phone:pb-[max(1.25rem,env(safe-area-inset-bottom))] phone:pt-4',
              'sm:px-8 sm:pb-8 sm:pt-4',
            )}
          >
            <p className="max-w-none text-center text-[0.75rem] leading-relaxed tracking-[0.01em] text-zinc-500 sm:max-w-[26rem] sm:text-xs">
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
          </CardFooter>
        </Card>
      </div>
    </AuthLightPageSurface>
  )
}
