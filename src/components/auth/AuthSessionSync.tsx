import { useEffect } from 'react'

import {
  clearAuthRememberMePreference,
  isSupabaseConfigured,
  supabase,
} from '@/lib/supabaseClient'
import { resolveAuthUser, supabaseUserToAuthUser } from '@/lib/mapSupabaseUser'
import { refreshProfileExtras } from '@/lib/syncBackendProfile'
import { useAuthStore } from '@/stores/authStore'
import { useBillingStore } from '@/stores/billingStore'
import { useProfileExtrasStore } from '@/stores/profileExtrasStore'

/** Cap wait for Supabase `getSession` so ProtectedRoute never blocks indefinitely. */
const SESSION_BOOTSTRAP_MS = 12_000
/** Persist rehydration from localStorage should finish quickly; don’t block bootstrap forever. */
const PERSIST_WAIT_MS = 5_000

function waitPersistReady(maxMs: number): Promise<void> {
  if (useAuthStore.persist.hasHydrated()) return Promise.resolve()
  return new Promise<void>((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(tid)
      unsub()
      resolve()
    }
    const unsub = useAuthStore.persist.onFinishHydration(finish)
    const tid = setTimeout(finish, maxMs)
  })
}

function applyPersistFallbackSession(clearSession: () => void): void {
  const st = useAuthStore.getState()
  if (st.accessToken && st.user) {
    useBillingStore.getState().setActiveUserId(st.user.id)
    void refreshProfileExtras()
  } else {
    useBillingStore.getState().setActiveUserId(null)
    clearSession()
    useProfileExtrasStore.getState().reset()
  }
}

/**
 * Keeps Zustand in sync with Supabase session (refresh, multi-tab, recovery links).
 */
export function AuthSessionSync() {
  const setSession = useAuthStore((s) => s.setSession)
  const clearSession = useAuthStore((s) => s.clearSession)
  const setAuthHydrated = useAuthStore((s) => s.setAuthHydrated)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      useBillingStore.getState().setActiveUserId(null)
      clearSession()
      useProfileExtrasStore.getState().reset()
      setAuthHydrated(true)
      return
    }

    let cancelled = false

    const bootstrap = async () => {
      if (cancelled) return
      await waitPersistReady(PERSIST_WAIT_MS)
      if (cancelled) return

      try {
        const outcome = await Promise.race([
          supabase.auth.getSession().then((r) => ({ kind: 'session' as const, r })),
          new Promise<{ kind: 'timeout' }>((resolve) =>
            setTimeout(() => resolve({ kind: 'timeout' }), SESSION_BOOTSTRAP_MS),
          ),
        ])
        if (cancelled) return

        if (outcome.kind === 'timeout') {
          applyPersistFallbackSession(clearSession)
          return
        }

        const {
          data: { session },
        } = outcome.r
        if (session?.user) {
          let resolved = session.user
          try {
            resolved = await resolveAuthUser(supabase, session.user)
          } catch {
            /* getUser() can fail offline; session user is enough to unlock the app */
          }
          if (cancelled) return
          setSession(session.access_token, supabaseUserToAuthUser(resolved))
          useBillingStore.getState().setActiveUserId(session.user.id)
          void refreshProfileExtras()
        } else {
          clearAuthRememberMePreference()
          useBillingStore.getState().setActiveUserId(null)
          clearSession()
          useProfileExtrasStore.getState().reset()
        }
      } catch {
        if (cancelled) return
        applyPersistFallbackSession(clearSession)
      } finally {
        if (!cancelled) setAuthHydrated(true)
      }
    }

    void bootstrap()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        if (session?.user) {
          let resolved = session.user
          try {
            resolved = await resolveAuthUser(supabase, session.user)
          } catch {
            /* offline / transient Auth API errors */
          }
          setSession(session.access_token, supabaseUserToAuthUser(resolved))
          useBillingStore.getState().setActiveUserId(session.user.id)
          void refreshProfileExtras()
        } else {
          clearAuthRememberMePreference()
          useBillingStore.getState().setActiveUserId(null)
          clearSession()
          useProfileExtrasStore.getState().reset()
        }
      })()
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [setSession, clearSession, setAuthHydrated])

  return null
}
