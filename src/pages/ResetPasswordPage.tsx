import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

import { AuthShell } from '@/components/marketing/AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatAuthError } from '@/lib/authErrors'
import { resolveAuthUser, supabaseUserToAuthUser } from '@/lib/mapSupabaseUser'
import { publicNavActiveClass } from '@/lib/publicHeaderNavStyles'
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient'
import { syncBackendProfile } from '@/lib/syncBackendProfile'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

const fieldClass =
  'box-border h-12 max-w-full rounded-xl border border-white/15 bg-white/[0.06] pl-11 pr-3 text-base text-zinc-100 transition-colors placeholder:text-zinc-500 focus-visible:border-[#c8ff00]/45 focus-visible:ring-2 focus-visible:ring-[#c8ff00]/20 sm:text-sm'

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
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#050506] text-zinc-400">
        Loading…
      </div>
    )
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-[#050506] px-4 text-center text-zinc-400">
        <p>Supabase env vars are missing. Add them to frontend/.env</p>
        <Link to="/login" className="text-[#dfff7a] underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  if (!sessionReady) {
    return (
      <AuthShell
        accent="login"
        title="Link expired or invalid"
        subtitle="Request a new reset link from the forgot password page."
        footer={
          <p className="w-full text-center text-sm text-zinc-400">
            <Link
              to="/forgot-password"
              className="font-semibold text-[#dfff7a] no-underline hover:text-[#c8ff00] hover:underline"
            >
              Forgot password
            </Link>
            {' · '}
            <Link
              to="/login"
              className="font-semibold text-[#dfff7a] no-underline hover:text-[#c8ff00] hover:underline"
            >
              Sign in
            </Link>
          </p>
        }
      >
        <p className="text-sm text-zinc-400">
          Open the link from your email in this browser. If you already reset your password,
          sign in normally.
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      accent="login"
      title="Choose a new password"
      subtitle="Use at least 8 characters."
      footer={
        <p className="w-full text-center text-sm text-zinc-400">
          <Link
            to="/login"
            className="font-semibold text-[#dfff7a] no-underline hover:text-[#c8ff00] hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid min-w-0 gap-2">
          <Label htmlFor="reset-password" className="text-sm font-medium text-zinc-200">
            New password
          </Label>
          <div className="relative min-w-0">
            <Lock
              className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-[18px] -translate-y-1/2 text-zinc-500"
              strokeWidth={1.75}
              aria-hidden
            />
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className={fieldClass}
            />
          </div>
        </div>
        <div className="grid min-w-0 gap-2">
          <Label htmlFor="reset-confirm" className="text-sm font-medium text-zinc-200">
            Confirm password
          </Label>
          <div className="relative min-w-0">
            <Lock
              className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-[18px] -translate-y-1/2 text-zinc-500"
              strokeWidth={1.75}
              aria-hidden
            />
            <Input
              id="reset-confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat password"
              value={confirm}
              onChange={(ev) => setConfirm(ev.target.value)}
              className={fieldClass}
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={busy}
          className={cn(publicNavActiveClass, 'w-full gap-2')}
        >
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
    </AuthShell>
  )
}
