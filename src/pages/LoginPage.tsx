import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

import { AuthCardEyebrow, AUTH_EYEBROW_ACCOUNT_ACCESS } from '@/components/auth/AuthCardEyebrow'
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

type LoginState = { from?: string; emailJustVerified?: boolean } | null

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useAuthStore((s) => s.setSession)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      toast.error(
        'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env (Supabase → API).',
      )
      return
    }
    const em = email.trim()
    if (!em || !password) {
      toast.error('Enter your email and password.')
      return
    }
    setBusy(true)
    try {
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
        toast.success("You're signed in — welcome back!", { duration: 4500 })
        navigate(from, { replace: true })
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
          <CardHeader className="space-y-2 border-b border-zinc-100 px-6 pb-4 pt-8 text-center sm:px-8 sm:pt-8">
            <AuthCardEyebrow label={AUTH_EYEBROW_ACCOUNT_ACCESS} variant="light" />
            <CardTitle className="font-display text-xl font-normal !leading-snug tracking-tight text-zinc-900 sm:text-2xl">
              Welcome back
            </CardTitle>
            <p className="text-sm leading-snug text-zinc-600">
              Sign in to continue to your workspace.
            </p>
          </CardHeader>

          <CardContent className="px-6 pb-0 pt-4 sm:px-8">
            <form onSubmit={onSubmit} className="min-w-0 space-y-5">
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="login-email" className={authFormLabelLightClass}>
                  Email
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  className={authFormFieldCompactLightClass}
                />
              </div>
              <div className="grid min-w-0 gap-2">
                <div className="flex items-end justify-between gap-2">
                  <Label htmlFor="login-password" className={authFormLabelLightClass}>
                    Password
                  </Label>
                  <Link
                    to="/forgot-password"
                    className="pb-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-zinc-500 no-underline transition hover:text-zinc-800"
                  >
                    Forgot?
                  </Link>
                </div>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  className={authFormFieldCompactLightClass}
                />
              </div>
              <Button type="submit" disabled={busy} className={authFormPrimaryButtonLightClass}>
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
          </CardContent>

          <CardFooter className="flex flex-col border-0 bg-transparent px-6 pb-8 pt-5 sm:px-8">
            <p className="text-center text-sm text-zinc-600">
              No account yet?{' '}
              <Link
                to={signupHref}
                className="font-semibold text-zinc-900 no-underline underline-offset-4 transition hover:underline"
              >
                Create one
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
