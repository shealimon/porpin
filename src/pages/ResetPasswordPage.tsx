import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

import { AuthCardEyebrow, AUTH_EYEBROW_ACCOUNT_ACCESS } from '@/components/auth/AuthCardEyebrow'
import { AuthLightPageSurface } from '@/components/auth/AuthLightPageSurface'
import { PorpinMark } from '@/components/brand/PorpinMark'
import { PorpinWordmark } from '@/components/brand/PorpinWordmark'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatAuthError } from '@/lib/authErrors'
import {
  authFormFieldPasswordLightClass,
  authFormLabelLightClass,
  authFormPrimaryButtonLightClass,
} from '@/lib/authFormStyles'
import { resolveAuthUser, supabaseUserToAuthUser } from '@/lib/mapSupabaseUser'
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient'
import { syncBackendProfile } from '@/lib/syncBackendProfile'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

/** Wait for Supabase to parse hash/query recovery tokens before deciding the link is invalid. */
const RECOVERY_POLL_MS = 200
const RECOVERY_POLL_ATTEMPTS = 25

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session || cancelled) return
        if (
          event === 'PASSWORD_RECOVERY' ||
          event === 'SIGNED_IN' ||
          event === 'INITIAL_SESSION'
        ) {
          markFound()
        }
      },
    )

    void (async () => {
      for (let i = 0; i < RECOVERY_POLL_ATTEMPTS && !found && !cancelled; i++) {
        const { data: { session } } = await supabase.auth.getSession()
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
    // Keep the same page chrome as login/signup while we wait for Supabase.
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
            <PorpinWordmark />
          </Link>

          <Card className="w-full max-w-[380px] gap-0 overflow-hidden rounded-xl border border-zinc-200 bg-white py-0 shadow-sm">
            <CardHeader className="space-y-3 border-b border-zinc-100 px-6 pb-6 pt-8 text-center sm:px-8 sm:pt-8">
              <AuthCardEyebrow label={AUTH_EYEBROW_ACCOUNT_ACCESS} variant="light" />
              <CardTitle className="font-display text-xl font-normal !leading-snug tracking-tight text-zinc-900 sm:text-2xl">
                Loading…
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-8 pt-8 text-center text-sm text-zinc-600 sm:px-8">
              Please wait a moment.
            </CardContent>
          </Card>
        </div>
      </AuthLightPageSurface>
    )
  }

  if (!isSupabaseConfigured()) {
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
            <PorpinWordmark />
          </Link>

          <Card className="w-full max-w-[380px] gap-0 overflow-hidden rounded-xl border border-zinc-200 bg-white py-0 shadow-sm">
            <CardHeader className="space-y-3 border-b border-zinc-100 px-6 pb-6 pt-8 text-center sm:px-8 sm:pt-8">
              <AuthCardEyebrow label={AUTH_EYEBROW_ACCOUNT_ACCESS} variant="light" />
              <CardTitle className="font-display text-xl font-normal !leading-snug tracking-tight text-zinc-900 sm:text-2xl">
                Supabase is not configured
              </CardTitle>
              <p className="text-sm leading-relaxed text-zinc-600">
                Supabase env vars are missing. Add them to <span className="font-mono">frontend/.env</span>.
              </p>
            </CardHeader>
            <CardFooter className="flex flex-col border-0 bg-transparent px-6 pb-8 pt-6 sm:px-8">
              <p className="text-center text-sm text-zinc-600">
                <Link
                  to="/login"
                  className="font-semibold text-zinc-900 no-underline underline-offset-4 transition hover:underline"
                >
                  Back to sign in
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </AuthLightPageSurface>
    )
  }

  if (!sessionReady) {
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
            <PorpinWordmark />
          </Link>

          <Card className="w-full max-w-[380px] gap-0 overflow-hidden rounded-xl border border-zinc-200 bg-white py-0 shadow-sm">
            <CardHeader className="space-y-3 border-b border-zinc-100 px-6 pb-6 pt-8 text-center sm:px-8 sm:pt-8">
              <AuthCardEyebrow label={AUTH_EYEBROW_ACCOUNT_ACCESS} variant="light" />
              <CardTitle className="font-display text-xl font-normal !leading-snug tracking-tight text-zinc-900 sm:text-2xl">
                Link expired or invalid
              </CardTitle>
              <p className="text-sm leading-relaxed text-zinc-600">
                Request a new reset link from the forgot password page.
              </p>
            </CardHeader>

            <CardContent className="px-6 pb-0 pt-8 sm:px-8">
              <p className="text-sm leading-relaxed text-zinc-600">
                Open the link from your email in this browser. If you already reset your password,
                sign in normally.
              </p>
            </CardContent>

            <CardFooter className="flex flex-col border-0 bg-transparent px-6 pb-8 pt-5 sm:px-8">
              <p className="text-center text-sm text-zinc-600">
                <Link
                  to="/forgot-password"
                  className="font-semibold text-zinc-900 no-underline underline-offset-4 transition hover:underline"
                >
                  Forgot password
                </Link>
                {' · '}
                <Link
                  to="/login"
                  className="font-semibold text-zinc-900 no-underline underline-offset-4 transition hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </AuthLightPageSurface>
    )
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
          <PorpinWordmark />
        </Link>

        <Card className="w-full max-w-[380px] gap-0 overflow-hidden rounded-xl border border-zinc-200 bg-white py-0 shadow-sm">
          <CardHeader className="space-y-3 border-b border-zinc-100 px-6 pb-6 pt-8 text-center sm:px-8 sm:pt-8">
            <AuthCardEyebrow label={AUTH_EYEBROW_ACCOUNT_ACCESS} variant="light" />
            <CardTitle className="font-display text-xl font-normal !leading-snug tracking-tight !text-stone-900 dark:!text-stone-100 sm:text-2xl">
              Choose a new password
            </CardTitle>
            <p className="text-sm leading-relaxed text-zinc-600">Use at least 8 characters.</p>
          </CardHeader>

          <CardContent className="px-6 pb-0 pt-8 sm:px-8">
            <form onSubmit={onSubmit} className="min-w-0 space-y-5">
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="reset-password" className={authFormLabelLightClass}>
                  New password
                </Label>
                <Input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  className={authFormFieldPasswordLightClass}
                />
              </div>

              <div className="grid min-w-0 gap-2">
                <Label htmlFor="reset-confirm" className={authFormLabelLightClass}>
                  Confirm password
                </Label>
                <Input
                  id="reset-confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  value={confirm}
                  onChange={(ev) => setConfirm(ev.target.value)}
                  className={authFormFieldPasswordLightClass}
                />
              </div>

              <Button type="submit" disabled={busy} className={cn(authFormPrimaryButtonLightClass, 'gap-2')}>
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

          <CardFooter className="flex flex-col border-0 bg-transparent px-6 pb-8 pt-5 sm:px-8">
            <p className="text-center text-sm text-zinc-600">
              <Link
                to="/login"
                className="font-semibold text-zinc-900 no-underline underline-offset-4 transition hover:underline"
              >
                Back to sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </AuthLightPageSurface>
  )
}
