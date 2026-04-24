import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { useAuthStore } from '@/stores/authStore'

export type UserBillingSlice = {
  trialStartedAt: string | null
  trialWordsConsumed: number
}

const LEGACY_KEY = '__legacy__'

type PersistedBillingV2 = {
  activeUserId: string | null
  billingByUser: Record<string, UserBillingSlice>
}

function emptyUser(): UserBillingSlice {
  return { trialStartedAt: null, trialWordsConsumed: 0 }
}

function resolveUserId(s: BillingState): string | null {
  return s.activeUserId ?? useAuthStore.getState().user?.id ?? null
}

function getSlice(s: BillingState, userId: string): UserBillingSlice {
  return s.billingByUser[userId] ?? emptyUser()
}

interface BillingState {
  activeUserId: string | null
  billingByUser: Record<string, UserBillingSlice>
  setActiveUserId: (userId: string | null) => void
  /** Clears trial tracking for the current account (call on sign-out). */
  resetActiveUserBilling: () => void
  startTrialClockIfNeeded: () => void
  consumeTrialWords: (n: number) => void
  /** Dev / full wipe. */
  reset: () => void
}

function normalizeSlice(v: unknown): UserBillingSlice {
  if (!v || typeof v !== 'object') return emptyUser()
  const o = v as Partial<UserBillingSlice> & { transactions?: unknown }
  return {
    trialStartedAt: o.trialStartedAt ?? null,
    trialWordsConsumed: typeof o.trialWordsConsumed === 'number' ? o.trialWordsConsumed : 0,
  }
}

export const useBillingStore = create<BillingState>()(
  persist(
    (set) => ({
      activeUserId: null,
      billingByUser: {},
      setActiveUserId: (userId) =>
        set((s) => {
          if (!userId) {
            return { activeUserId: null, billingByUser: s.billingByUser }
          }
          if (s.billingByUser[userId]) {
            return { activeUserId: userId, billingByUser: s.billingByUser }
          }
          const legacy = s.billingByUser[LEGACY_KEY]
          if (legacy) {
            const { [LEGACY_KEY]: _, ...rest } = s.billingByUser
            return {
              activeUserId: userId,
              billingByUser: { ...rest, [userId]: normalizeSlice(legacy) },
            }
          }
          return {
            activeUserId: userId,
            billingByUser: { ...s.billingByUser, [userId]: emptyUser() },
          }
        }),
      resetActiveUserBilling: () =>
        set((s) => {
          const id = resolveUserId(s)
          if (!id) return {}
          return {
            billingByUser: { ...s.billingByUser, [id]: emptyUser() },
          }
        }),
      startTrialClockIfNeeded: () =>
        set((s) => {
          const id = resolveUserId(s)
          if (!id) return {}
          const slice = getSlice(s, id)
          if (slice.trialStartedAt) return {}
          const next: UserBillingSlice = {
            ...slice,
            trialStartedAt: new Date().toISOString(),
          }
          return {
            activeUserId: s.activeUserId ?? id,
            billingByUser: { ...s.billingByUser, [id]: next },
          }
        }),
      consumeTrialWords: (n) =>
        set((s) => {
          const id = resolveUserId(s)
          if (!id) return {}
          const slice = getSlice(s, id)
          const next: UserBillingSlice = {
            ...slice,
            trialWordsConsumed: slice.trialWordsConsumed + Math.max(0, n),
          }
          return {
            activeUserId: s.activeUserId ?? id,
            billingByUser: { ...s.billingByUser, [id]: next },
          }
        }),
      reset: () =>
        set({
          activeUserId: null,
          billingByUser: {},
        }),
    }),
    {
      name: 'translator-billing',
      version: 3,
      partialize: (state) => ({
        activeUserId: state.activeUserId,
        billingByUser: state.billingByUser,
      }),
      /** Old saves had flat `transactions` / trial fields (no `billingByUser`), and often no `version`. */
      merge: (persistedState, currentState) => {
        const p = persistedState as Partial<PersistedBillingV2> &
          Partial<UserBillingSlice> &
          Record<string, unknown> | null
        if (!p || typeof p !== 'object') {
          return currentState
        }
        if (p.billingByUser && typeof p.billingByUser === 'object') {
          const raw = p.billingByUser as Record<string, unknown>
          const billingByUser: Record<string, UserBillingSlice> = {}
          for (const [k, v] of Object.entries(raw)) {
            billingByUser[k] = normalizeSlice(v)
          }
          return {
            ...currentState,
            activeUserId: p.activeUserId ?? null,
            billingByUser,
          }
        }
        if ('transactions' in p || 'trialStartedAt' in p || 'trialWordsConsumed' in p) {
          return {
            ...currentState,
            activeUserId: null,
            billingByUser: {
              [LEGACY_KEY]: {
                trialStartedAt: (p.trialStartedAt as string | null) ?? null,
                trialWordsConsumed: (p.trialWordsConsumed as number) ?? 0,
              },
            },
          }
        }
        return currentState
      },
    },
  ),
)
