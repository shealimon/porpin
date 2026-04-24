import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
  /** False until first Supabase getSession completes (avoid protected-route flash). */
  authHydrated: boolean
  setSession: (token: string, user: AuthUser) => void
  clearSession: () => void
  setAuthHydrated: (hydrated: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      authHydrated: false,
      setSession: (accessToken, user) => set({ accessToken, user }),
      clearSession: () => set({ accessToken: null, user: null }),
      setAuthHydrated: (authHydrated) => set({ authHydrated }),
    }),
    {
      name: 'translator-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
      }),
    },
  ),
)
