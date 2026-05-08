import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import {
  isSupabaseConfigured,
  supabase,
  supabaseConfigMissingUserMessage,
} from '@/lib/supabaseClient'
import { useAuthStore } from '@/stores/authStore'

function parseHashParams(): Record<string, string> {
  const raw = window.location.hash.replace(/^#/, '').trim()
  if (!raw) return {}
  try {
    return Object.fromEntries(new URLSearchParams(raw))
  } catch {
    return {}
  }
}

/** Handles Supabase email verification links; signs out and sends user to login (no dashboard auto-entry). */
export function AuthConfirmPage() {
  const navigate = useNavigate()
  const clearSession = useAuthStore((s) => s.clearSession)
  const finished = useRef(false)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      toast.error(supabaseConfigMissingUserMessage)
      navigate('/login', { replace: true })
      return
    }

    const hashParams = parseHashParams()
    const linkType = hashParams.type
    const err = hashParams.error
    const errDesc = hashParams.error_description

    if (err) {
      toast.error(
        errDesc
          ? decodeURIComponent(errDesc.replace(/\+/g, ' '))
          : err === 'access_denied'
            ? 'This confirmation link is invalid or has expired.'
            : 'Email confirmation failed.',
      )
      navigate('/login', { replace: true })
      return
    }

    if (linkType !== 'signup') {
      navigate('/login', { replace: true })
      return
    }

    const complete = async (hasSession: boolean) => {
      if (finished.current) return
      finished.current = true

      if (!hasSession) {
        toast.error(
          'Could not confirm email from this link. Try signing in, or create a new account.',
          { duration: 6000 },
        )
        navigate('/login', { replace: true })
        return
      }

      try {
        await supabase.auth.signOut()
      } catch {
        toast.error('Could not finish server sign-out. You can still try signing in.')
      }
      clearSession()
      navigate('/login', {
        replace: true,
        state: { emailJustVerified: true as const },
      })
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (finished.current) return
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        void complete(true)
      }
    })

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (finished.current) return
      if (session) void complete(true)
    })

    timeoutId = setTimeout(() => {
      if (!finished.current) {
        void supabase.auth.getSession().then(({ data: { session } }) => {
          void complete(Boolean(session))
        })
      }
    }, 6000)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [navigate, clearSession])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-[#050506] px-4 text-center">
      <p className="text-sm font-medium text-zinc-200">Verifying your email…</p>
      <p className="max-w-sm text-xs text-zinc-500">You’ll be taken to sign in next.</p>
    </div>
  )
}
