import { useState } from 'react'
import { Link } from 'react-router-dom'
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
  authFormLabelLightClass,
  authFormPrimaryButtonLightClass,
  authLightMobileCardClass,
  authLightMobileContentInsetClass,
  authLightMobileHideCardLogoClass,
  authLightMobilePageShellClass,
} from '@/lib/authFormStyles'
import {
  isSupabaseConfigured,
  supabase,
  supabaseConfigMissingUserMessage,
} from '@/lib/supabaseClient'
import { cn } from '@/lib/utils'

const authShellClass = cn(
  'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain desk:overflow-visible',
  authLightMobilePageShellClass,
  /* Phone: vertically center the card in the main area (override shell justify-start). */
  'phone:justify-center',
  'sm:items-center sm:justify-start sm:bg-transparent',
  'sm:pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))]',
  'sm:pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pt-5 sm:justify-center sm:-translate-y-7 sm:py-12 sm:pt-12',
  'desk:justify-start desk:translate-y-0 desk:py-10 desk:pb-14 desk:pt-8',
  'touch-manipulation [-webkit-tap-highlight-color:transparent]',
)

const authCardClass = cn(
  'flex w-full flex-col gap-0 overflow-hidden bg-white py-0',
  authLightMobileCardClass,
  /* Phone: content-height card so justify-center can place it in the middle. */
  'phone:flex-none',
  'sm:max-w-[380px] sm:rounded-xl sm:border sm:border-zinc-200 sm:shadow-sm lg:max-w-[440px]',
)

const authHeaderClass = cn(
  'flex flex-col items-center gap-3 border-b border-zinc-100 text-center sm:gap-4 lg:gap-5',
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

const inputMobileClass = cn(
  authFormFieldCompactLightClass,
  'phone:h-14 phone:min-h-14 phone:rounded-xl phone:border-zinc-200 phone:px-4 phone:text-[1.0625rem] phone:shadow-none',
)

const cardTitleClass =
  'flex w-full flex-wrap items-center justify-center gap-2.5 font-display text-[1.5rem] font-semibold !leading-snug tracking-tight text-zinc-950 sm:gap-2.5 sm:text-2xl sm:font-normal lg:gap-3 lg:text-[1.75rem]'

const sparklesClass =
  'size-[1.25rem] shrink-0 text-zinc-400 sm:size-[1.3125rem] lg:size-[1.4375rem]'

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
      toast.success('Check your email for the password reset link.', { duration: 7000 })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLightPageSurface>
      <div className={authShellClass}>
        <Card className={authCardClass}>
          <CardHeader className={authHeaderClass}>
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
            <CardTitle className={cardTitleClass}>
              <Sparkles className={sparklesClass} strokeWidth={2} aria-hidden />
              Reset your password
            </CardTitle>
            <p
              className={cn(
                'mx-auto w-full max-w-[22rem] text-center text-[0.9375rem] leading-relaxed sm:max-w-none sm:text-sm',
                sent ? 'text-zinc-600 sm:text-zinc-600' : 'text-zinc-500 sm:text-zinc-600',
              )}
            >
              {sent
                ? 'Check your inbox for a reset link. It may take a minute.'
                : "Enter your email and we'll send you a reset link."}
            </p>
          </CardHeader>

          <CardContent className={authContentClass}>
            {!sent ? (
              <form onSubmit={onSubmit} className="min-w-0 space-y-5 sm:space-y-5">
                <div className="grid min-w-0 gap-2 sm:gap-2">
                  <Label htmlFor="forgot-email" className={cn(authFormLabelLightClass, 'phone:text-zinc-600')}>
                    Email
                  </Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                    className={inputMobileClass}
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
              <p className="text-sm leading-relaxed text-zinc-600 sm:text-sm">
                If you don’t see the email within a few minutes, check your spam folder.
              </p>
            )}
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
