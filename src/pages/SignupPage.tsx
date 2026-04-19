import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

import { AuthCardEyebrow, AUTH_EYEBROW_NEW_ACCOUNT } from '@/components/auth/AuthCardEyebrow'
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
  authFormLabelLightClass,
  authFormPrimaryButtonLightClass,
} from '@/lib/authFormStyles'
import { resolveAuthUser, supabaseUserToAuthUser } from '@/lib/mapSupabaseUser'
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient'
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
      toast.error(
        'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env (Supabase → API).',
      )
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
      const uploadTier =
        searchParams.get('plan') === 'payg' || searchParams.get('tier') === 'payg'
          ? 'payg'
          : 'trial'
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
        setSession(data.session.access_token, supabaseUserToAuthUser(u), {
          uploadTier,
        })
        await syncBackendProfile()
        toast.success("You're all set — taking you to upload.", { duration: 5000 })
        navigate('/app/upload', { replace: true })
      } else {
        toast.success(
          'We sent a verification link to your email. Open it, then return here to sign in.',
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
      <div className="-translate-y-4 flex flex-1 flex-col items-center justify-center px-4 py-10 sm:-translate-y-7 sm:py-12">
        <Link
          to="/"
          className={cn(
            'group mb-10 flex items-center gap-2.5 text-zinc-900 no-underline transition-opacity hover:opacity-80',
          )}
        >
          <span
            className="flex size-10 shrink-0 items-center justify-center transition duration-200 group-hover:opacity-90"
            aria-hidden
          >
            <PorpinMark className="size-full" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight">Porpin</span>
        </Link>

        <Card className="w-full max-w-[420px] gap-0 overflow-hidden rounded-xl border border-zinc-200 bg-white py-0 shadow-sm">
          <CardHeader className="space-y-3 border-b border-zinc-100 px-6 pb-6 pt-8 text-center sm:px-8 sm:pt-8">
            <AuthCardEyebrow label={AUTH_EYEBROW_NEW_ACCOUNT} variant="light" />
            <CardTitle className="font-display text-xl font-normal !leading-snug tracking-tight text-zinc-900 sm:text-2xl">
              Create your account
            </CardTitle>
          </CardHeader>

          <CardContent className="px-6 pb-0 pt-8 sm:px-8">
            <form onSubmit={onSubmit} className="min-w-0 space-y-5">
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <div className="grid min-w-0 gap-2">
                  <Label htmlFor="signup-first" className={authFormLabelLightClass}>
                    First name
                  </Label>
                  <Input
                    id="signup-first"
                    type="text"
                    autoComplete="given-name"
                    placeholder="John"
                    value={firstName}
                    onChange={(ev) => setFirstName(ev.target.value)}
                    className={authFormFieldCompactLightClass}
                  />
                </div>
                <div className="grid min-w-0 gap-2">
                  <Label htmlFor="signup-last" className={authFormLabelLightClass}>
                    Last name
                  </Label>
                  <Input
                    id="signup-last"
                    type="text"
                    autoComplete="family-name"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(ev) => setLastName(ev.target.value)}
                    className={authFormFieldCompactLightClass}
                  />
                </div>
              </div>
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="signup-email" className={authFormLabelLightClass}>
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
                  className={authFormFieldCompactLightClass}
                />
              </div>
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="signup-password" className={authFormLabelLightClass}>
                  Password
                </Label>
                <Input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  className={authFormFieldCompactLightClass}
                />
              </div>
              <p className="text-xs leading-relaxed text-zinc-500">
                Use at least 8 characters.
              </p>
              <Button type="submit" disabled={busy} className={authFormPrimaryButtonLightClass}>
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

          <CardFooter className="flex flex-col border-0 bg-transparent px-6 pb-8 pt-5 sm:px-8">
            <p className="text-center text-sm text-zinc-600">
              Already registered?{' '}
              <Link
                to={loginHref}
                className="font-semibold text-zinc-900 no-underline underline-offset-4 transition hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>

        <p className="mt-8 max-w-[420px] text-center text-xs leading-relaxed text-zinc-500">
          By continuing you agree to our{' '}
          <a
            href="#"
            className="text-zinc-600 underline decoration-zinc-300 underline-offset-4 transition hover:text-zinc-800"
            onClick={(e) => e.preventDefault()}
          >
            Terms
          </a>{' '}
          and{' '}
          <a
            href="#"
            className="text-zinc-600 underline decoration-zinc-300 underline-offset-4 transition hover:text-zinc-800"
            onClick={(e) => e.preventDefault()}
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </AuthLightPageSurface>
  )
}
