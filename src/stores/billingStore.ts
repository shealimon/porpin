import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { useAuthStore } from '@/stores/authStore'

export type BillingTxKind = 'payg_demo' | 'included_words'

export type BillingTransaction = {
  id: string
  createdAt: string
  jobId?: string
  fileName?: string
  words: number
  amountInr: number
  status: 'succeeded' | 'pending' | 'failed'
  kind: BillingTxKind
}

export type UserBillingSlice = {
  trialStartedAt: string | null
  trialWordsConsumed: number
  transactions: BillingTransaction[]
}

const LEGACY_KEY = '__legacy__'

type PersistedBillingV2 = {
  activeUserId: string | null
  billingByUser: Record<string, UserBillingSlice>
}

function emptyUser(): UserBillingSlice {
  return { trialStartedAt: null, trialWordsConsumed: 0, transactions: [] }
}

function newTxId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `tx-${Date.now()}`
}

function resolveUserId(s: BillingState): string | null {
  return s.activeUserId ?? useAuthStore.getState().user?.id ?? null
}

function getSlice(s: BillingState, userId: string): UserBillingSlice {
  return s.billingByUser[userId] ?? emptyUser()
}

/** Active slice for the signed-in user (for hooks / UI). */
export function selectUserBilling(s: BillingState): UserBillingSlice {
  const id = resolveUserId(s)
  if (!id) return emptyUser()
  return getSlice(s, id)
}

/** Snapshot for non-React code paths (e.g. confirm job). */
export function getActiveBillingSnapshot(): UserBillingSlice {
  return selectUserBilling(useBillingStore.getState())
}

interface BillingState {
  activeUserId: string | null
  billingByUser: Record<string, UserBillingSlice>
  setActiveUserId: (userId: string | null) => void
  /** Clears trial + transaction list for the current account (call on sign-out). */
  resetActiveUserBilling: () => void
  startTrialClockIfNeeded: () => void
  consumeTrialWords: (n: number) => void
  addTransaction: (tx: Omit<BillingTransaction, 'id' | 'createdAt'>) => void
  /** Dev / full wipe. */
  reset: () => void
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
              billingByUser: { ...rest, [userId]: { ...legacy } },
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
      addTransaction: (tx) =>
        set((s) => {
          const id = resolveUserId(s)
          if (!id) return {}
          const slice = getSlice(s, id)
          const row: BillingTransaction = {
            ...tx,
            id: newTxId(),
            createdAt: new Date().toISOString(),
          }
          const next: UserBillingSlice = {
            ...slice,
            transactions: [row, ...slice.transactions],
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
      version: 2,
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
          return {
            ...currentState,
            activeUserId: p.activeUserId ?? null,
            billingByUser: p.billingByUser as Record<string, UserBillingSlice>,
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
                transactions: Array.isArray(p.transactions)
                  ? (p.transactions as BillingTransaction[])
                  : [],
              },
            },
          }
        }
        return currentState
      },
    },
  ),
)
