import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuthStore } from '@/stores/authStore'

export function ProtectedRoute() {
  const authHydrated = useAuthStore((s) => s.authHydrated)
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const location = useLocation()

  if (!authHydrated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-zinc-500">
        Loading…
      </div>
    )
  }

  if (!user || !accessToken) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  return <Outlet />
}
