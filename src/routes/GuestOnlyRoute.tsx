import { Navigate, Outlet } from 'react-router-dom'

import { useAuthStore } from '@/stores/authStore'

export function GuestOnlyRoute() {
  const authHydrated = useAuthStore((s) => s.authHydrated)
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)

  if (!authHydrated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-zinc-500">
        Loading…
      </div>
    )
  }

  if (user && accessToken) {
    return <Navigate to="/app/upload" replace />
  }

  return <Outlet />
}
