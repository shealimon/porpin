import { useState } from 'react'
import { Link } from 'react-router-dom'
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
import {
  isSupabaseConfigured,
  supabase,
  supabaseConfigMissingUserMessage,
} from '@/lib/supabaseClient'
import { cn } from '@/lib/utils'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSupabaseConfigured()) {
      toast.error(supabaseConfigMissingUserMessage)
      return
    }
    const em = email.trim()
    if (!em) {
      toast.error('Enter your email.')
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(em, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) {
        toast.error(formatAuthError(error))
        return
      }
      setSent(true)
      toast.success(
        'If that email is registered, we sent reset instructions. Check your inbox and spam folder.',
        { duration: 7000 },
      )
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

        <Card className="w-full max-w-[380px] gap-0 overflow-hidden rounded-xl border border-zinc-200 bg-white py-0 shadow-sm">
          <CardHeader className="space-y-3 border-b border-zinc-100 px-6 pb-6 pt-8 text-center sm:px-8 sm:pt-8">
            <AuthCardEyebrow label={AUTH_EYEBROW_ACCOUNT_ACCESS} variant="light" />
            <CardTitle className="font-display text-xl font-normal !leading-snug tracking-tight text-zinc-900 sm:text-2xl">
              Reset your password
            </CardTitle>
            {sent ? (
              <p className="text-sm leading-relaxed text-zinc-600">
                Check your inbox for a reset link. It may take a minute.
              </p>
            ) : null}
          </CardHeader>

          <CardContent className="px-6 pb-0 pt-8 sm:px-8">
            {!sent ? (
              <form onSubmit={onSubmit} className="min-w-0 space-y-5">
                <div className="grid min-w-0 gap-2">
                  <Label htmlFor="forgot-email" className={authFormLabelLightClass}>
                    Email
                  </Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                    className={authFormFieldCompactLightClass}
                  />
                </div>
                <Button type="submit" disabled={busy} className={authFormPrimaryButtonLightClass}>
                  {busy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Sending…
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </Button>
              </form>
            ) : (
              <p className="text-sm leading-relaxed text-zinc-600">
                If you don’t see the email within a few minutes, check your spam folder.
              </p>
            )}
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

        <p className="mt-8 max-w-[380px] text-center text-xs leading-relaxed text-zinc-500">
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
