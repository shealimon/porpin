import { Link } from 'react-router-dom'
import { ArrowLeft, BookOpen, Sparkles } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type AuthShellProps = {
  title: string
  subtitle?: string
  children: React.ReactNode
  footer: React.ReactNode
  /** Tweaks the left panel accent line */
  accent?: 'login' | 'signup'
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  accent = 'login',
}: AuthShellProps) {
  const tag =
    accent === 'signup'
      ? 'Start your workspace'
      : 'Pick up where you left off'

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-x-hidden overflow-y-auto bg-[#050506]">
      {/* Ambient mesh — match landing */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.22),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed left-[10%] top-[24%] -z-10 h-[420px] w-[420px] rounded-full bg-[#c8ff00]/[0.06] blur-[120px]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -right-20 top-0 -z-10 h-[360px] w-[400px] rounded-full bg-violet-600/15 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(180deg,rgba(5,5,6,0)_0%,#050506_50%,#050506_100%)]"
        aria-hidden
      />

      <div className="relative z-0 mx-auto grid w-full min-w-0 max-w-6xl lg:min-h-[calc(100svh-5rem)] lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        {/* Left — storytelling (top-aligned + fixed tag block so login/signup match) */}
        <div className="relative hidden min-h-0 flex-col justify-start px-6 pb-12 pt-10 text-zinc-300 lg:flex lg:px-10 lg:pb-16 lg:pt-16 xl:px-14 xl:pt-20">
          <div className="space-y-8">
            <div className="flex min-h-[3.25rem] items-center">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-200 shadow-sm backdrop-blur-sm">
                <Sparkles className="size-3.5 shrink-0 text-[#c8ff00]" aria-hidden />
                <span className="leading-snug">{tag}</span>
              </div>
            </div>

            <div>
              <p
                className="font-voltix text-4xl font-semibold !leading-[1.1] !tracking-tight text-zinc-50 xl:text-[2.75rem] xl:!leading-[1.1]"
                role="heading"
                aria-level={2}
              >
                Books & docs,
                <span className="mt-2 block font-semibold text-[#dfff7a] [text-shadow:0_0_40px_rgba(200,255,0,0.25)]">
                  fluid Hinglish.
                </span>
              </p>
              <p className="mt-5 max-w-md text-base leading-relaxed text-zinc-400">
                Structure-aware translation for long PDFs and manuscripts—pricing upfront,
                consistent tone, DOCX and PDF out.
              </p>
            </div>

            <div className="rounded-2xl border border-white/12 bg-[#12121a] p-6 shadow-xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-md">
              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#c8ff00]/25 bg-[#c8ff00]/10 text-[#c8ff00]">
                  <BookOpen className="size-5" strokeWidth={1.75} aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-medium leading-relaxed text-zinc-100">
                    &ldquo;We kept chapter headings and lists intact—readers didn&apos;t feel a
                    &lsquo;pasted translation.&rsquo;&rdquo;
                  </p>
                  <p className="mt-3 text-xs font-medium text-zinc-500">
                    Editorial · demo quote
                  </p>
                </div>
              </div>
            </div>

            <Link
              to="/"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                '-ml-2 w-fit gap-2 text-zinc-400 hover:bg-white/5 hover:text-zinc-100',
              )}
            >
              <ArrowLeft className="size-4" aria-hidden />
              Back to home
            </Link>
          </div>
        </div>

        {/* Right — form */}
        <div className="relative z-10 flex min-h-0 min-w-0 flex-col justify-start px-4 pb-12 pt-10 sm:px-6 lg:pb-16 lg:pl-4 lg:pr-10 lg:pt-16 xl:pr-14 xl:pt-20">
          <div className="mx-auto w-full min-w-0 max-w-[440px]">
            <div className="relative isolate min-w-0">
              <div
                className="pointer-events-none absolute -inset-px -z-10 rounded-2xl bg-gradient-to-r from-[#c8ff00]/20 via-violet-500/20 to-transparent opacity-70 blur-lg"
                aria-hidden
              />
              <Card className="relative z-10 min-w-0 rounded-2xl border border-white/15 bg-[#12121a]/95 shadow-2xl shadow-black/50 ring-1 ring-white/10 backdrop-blur-xl">
                <div
                  className="h-1 w-full bg-gradient-to-r from-[#c8ff00] via-violet-500 to-[#6d28d9]"
                  aria-hidden
                />
                <CardHeader className="min-w-0 space-y-2 px-6 pb-0 pt-7 sm:px-8">
                  <CardTitle className="font-voltix text-2xl font-semibold !leading-snug !tracking-tight text-white sm:text-[1.65rem]">
                    {title}
                  </CardTitle>
                  {subtitle ? (
                    <CardDescription className="text-base !leading-relaxed text-zinc-400">
                      {subtitle}
                    </CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="min-w-0 px-6 pb-4 pt-6 sm:px-8">{children}</CardContent>
                <CardFooter className="mt-auto flex min-w-0 flex-col border-t border-white/10 bg-black/20 px-6 py-5 sm:px-8">
                  {footer}
                </CardFooter>
              </Card>
            </div>

            <Link
              to="/"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'mt-6 flex w-full items-center justify-center gap-2 text-zinc-400 hover:bg-white/5 hover:text-zinc-100 lg:hidden',
              )}
            >
              <ArrowLeft className="size-4" aria-hidden />
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
