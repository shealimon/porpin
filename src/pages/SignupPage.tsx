import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
  supabase,
  supabaseConfigMissingUserMessage,
} from '@/lib/supabaseClient'
import { syncBackendProfile } from '@/lib/syncBackendProfile'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { displayNameFromNameParts, setStoredUserName } from '@/utils/greeting'

export function SignupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const authQuery = searchParams.toString()
  const loginHref = authQuery ? `/login?${authQuery}` : '/login'
  const setSession = useAuthStore((s) => s.setSession)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSupabaseConfigured()) {
      toast.error(supabaseConfigMissingUserMessage)
      return
    }
    const fn = firstName.trim()
    if (!fn) {
      toast.error('Enter your first name')
      return
    }
    const ln = lastName.trim()
    if (!email.trim()) {
      toast.error('Enter your email')
      return
    }
    if (!password || password.length < 8) {
      toast.error('Choose a password with at least 8 characters.')
      return
    }
    setBusy(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          data: {
            first_name: fn,
            ...(ln ? { last_name: ln } : {}),
          },
        },
      })
      if (error) {
        toast.error(formatAuthError(error))
        return
      }
      const display = displayNameFromNameParts(fn, ln) || fn
      setStoredUserName(display)
      const user = data.session?.user
      if (data.session && user) {
        const u = await resolveAuthUser(supabase, user)
        setSession(data.session.access_token, supabaseUserToAuthUser(u))
        await syncBackendProfile()
        toast.success("You're all set — taking you to upload.", { duration: 5000 })
        navigate('/app/upload', { replace: true })
      } else {
        toast.success(
          'Check your email for a verification link, then sign in.',
          { duration: 8000 },
        )
        navigate('/login', { replace: true })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLightPageSurface>
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain',
          authLightMobilePageShellClass,
          'sm:items-center sm:justify-start sm:bg-transparent',
          'sm:pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))]',
          'sm:pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pt-5 sm:justify-center sm:-translate-y-7 sm:py-12 sm:pt-12',
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
              'phone:gap-3 phone:border-zinc-100 phone:pb-5 phone:pt-6',
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
                className="flex size-[3.125rem] shrink-0 items-center justify-center transition duration-200 group-hover:opacity-90 sm:size-12 lg:size-[3.625rem]"
                aria-hidden
              >
                <PorpinMark className="size-full text-zinc-900" aria-hidden />
              </span>
            </Link>
            <CardTitle className="flex w-full flex-wrap items-center justify-center gap-2.5 font-display text-[1.5rem] font-semibold !leading-snug tracking-tight text-zinc-950 sm:gap-2.5 sm:text-2xl sm:font-normal lg:gap-3 lg:text-[1.75rem]">
              <Sparkles
                className="size-[1.25rem] shrink-0 text-zinc-400 sm:size-[1.3125rem] lg:size-[1.4375rem]"
                strokeWidth={2}
                aria-hidden
              />
              Create your account
            </CardTitle>
            <p className="mx-auto w-full max-w-[22rem] text-center text-[0.9375rem] leading-relaxed text-zinc-500 sm:max-w-none sm:text-sm sm:text-zinc-600">
              Set up your workspace and get started.
            </p>
          </CardHeader>

          <CardContent
            className={cn(
              'flex flex-1 flex-col pb-0 sm:flex-none',
              authLightMobileContentInsetClass,
              'phone:pb-1 phone:pt-4',
              'sm:px-8 sm:pt-4',
            )}
          >
            <form onSubmit={onSubmit} className="min-w-0 space-y-5 sm:space-y-5">
              <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4">
                <div className="grid min-w-0 gap-2 sm:gap-2">
                  <Label htmlFor="signup-first" className={cn(authFormLabelLightClass, 'phone:text-zinc-600')}>
                    First name
                  </Label>
                  <Input
                    id="signup-first"
                    type="text"
                    autoComplete="given-name"
                    placeholder="John"
                    value={firstName}
                    onChange={(ev) => setFirstName(ev.target.value)}
                    className={cn(
                      authFormFieldCompactLightClass,
                      'phone:h-14 phone:min-h-14 phone:rounded-xl phone:border-zinc-200 phone:px-4 phone:text-[1.0625rem] phone:shadow-none',
                    )}
                  />
                </div>
                <div className="grid min-w-0 gap-2 sm:gap-2">
                  <Label htmlFor="signup-last" className={cn(authFormLabelLightClass, 'phone:text-zinc-600')}>
                    Last name
                  </Label>
                  <Input
                    id="signup-last"
                    type="text"
                    autoComplete="family-name"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(ev) => setLastName(ev.target.value)}
                    className={cn(
                      authFormFieldCompactLightClass,
                      'phone:h-14 phone:min-h-14 phone:rounded-xl phone:border-zinc-200 phone:px-4 phone:text-[1.0625rem] phone:shadow-none',
                    )}
                  />
                </div>
              </div>
              <div className="grid min-w-0 gap-2 sm:gap-2">
                <Label htmlFor="signup-email" className={cn(authFormLabelLightClass, 'phone:text-zinc-600')}>
                  Email
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  required
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
              <div className="grid min-w-0 gap-2 sm:gap-2">
                <Label htmlFor="signup-password" className={cn(authFormLabelLightClass, 'phone:text-zinc-600')}>
                  Password
                </Label>
                <Input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  className={cn(
                    authFormFieldPasswordLightClass,
                    'phone:h-14 phone:min-h-14 phone:rounded-xl phone:border-zinc-200 phone:px-4 phone:text-[1.0625rem] phone:shadow-none',
                  )}
                />
                <p className="mt-2 text-xs leading-relaxed text-zinc-500 sm:mt-1.5 sm:text-xs">
                  Use at least 8 characters.
                </p>
              </div>
              <Button
                type="submit"
                disabled={busy}
                className={cn(
                  authFormPrimaryButtonLightClass,
                  'phone:h-14 phone:min-h-14 phone:rounded-xl phone:text-[1.0625rem] phone:font-semibold phone:shadow-sm',
                )}
              >
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Creating account…
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter
            className={cn(
              'mt-auto flex flex-col gap-0 border-0 bg-transparent sm:mt-0',
              authLightMobileContentInsetClass,
              'phone:border-t phone:border-zinc-100 phone:bg-white phone:pb-[max(1rem,env(safe-area-inset-bottom))] phone:pt-5',
              'sm:px-8 sm:pb-8 sm:pt-5',
            )}
          >
            <p className="text-center text-[0.9375rem] leading-snug text-zinc-600 sm:text-sm">
              Already registered?{' '}
              <Link
                to={loginHref}
                className="font-semibold text-zinc-900 no-underline underline-offset-4 transition hover:underline active:opacity-80"
              >
                Sign in
              </Link>
            </p>
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
          </CardFooter>
        </Card>
      </div>
    </AuthLightPageSurface>
  )
}
