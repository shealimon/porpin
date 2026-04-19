import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UploadTier = 'trial' | 'payg'

export interface AuthUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  /** Profile image URL from Supabase user_metadata (e.g. OAuth `picture`, `avatar_url`). */
  avatarUrl?: string
}

interface AuthState {
  accessToken: string | null
  user: AuthUser | null
  /**
   * trial = free trial (PDF-only uploads, quota + time limits).
   * payg = pay-as-you-go (multi-format, charged per word estimate).
   */
  uploadTier: UploadTier
  /** False until first Supabase getSession completes (avoid protected-route flash). */
  authHydrated: boolean
  setSession: (
    token: string,
    user: AuthUser,
    options?: { uploadTier?: UploadTier },
  ) => void
  clearSession: () => void
  setUploadTier: (tier: UploadTier) => void
  setAuthHydrated: (hydrated: boolean) => void
}

function normalizeTier(raw: unknown): UploadTier {
  if (raw === 'payg') return 'payg'
  if (raw === 'free') return 'trial'
  return 'trial'
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      uploadTier: 'trial',
      authHydrated: false,
      setSession: (accessToken, user, options) =>
        set((state) => ({
          accessToken,
          user,
          uploadTier: normalizeTier(options?.uploadTier ?? state.uploadTier),
        })),
      clearSession: () =>
        set({ accessToken: null, user: null, uploadTier: 'trial' }),
      setUploadTier: (uploadTier) => set({ uploadTier: normalizeTier(uploadTier) }),
      setAuthHydrated: (authHydrated) => set({ authHydrated }),
    }),
    {
      name: 'translator-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        uploadTier: state.uploadTier,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && (state.uploadTier as string) === 'free') {
          state.uploadTier = 'trial'
        }
      },
    },
  ),
)
