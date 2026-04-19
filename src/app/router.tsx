import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'

import { stashReferralCodeFromQuery } from '@/lib/referralCapture'
import { AppLayout } from '@/routes/AppLayout'
import { GuestOnlyRoute } from '@/routes/GuestOnlyRoute'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { PublicLayout } from '@/routes/PublicLayout'

const LandingPage = lazy(() =>
  import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })),
)
const LoginPage = lazy(() =>
  import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const SignupPage = lazy(() =>
  import('@/pages/SignupPage').then((m) => ({ default: m.SignupPage })),
)
const ForgotPasswordPage = lazy(() =>
  import('@/pages/ForgotPasswordPage').then((m) => ({
    default: m.ForgotPasswordPage,
  })),
)
const ResetPasswordPage = lazy(() =>
  import('@/pages/ResetPasswordPage').then((m) => ({
    default: m.ResetPasswordPage,
  })),
)
const AuthConfirmPage = lazy(() =>
  import('@/pages/AuthConfirmPage').then((m) => ({
    default: m.AuthConfirmPage,
  })),
)
const AppUploadPage = lazy(() =>
  import('@/pages/AppUploadPage').then((m) => ({ default: m.AppUploadPage })),
)
const JobProgressPage = lazy(() =>
  import('@/pages/JobProgressPage').then((m) => ({ default: m.JobProgressPage })),
)
const HistoryPage = lazy(() =>
  import('@/pages/HistoryPage').then((m) => ({ default: m.HistoryPage })),
)
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const BillingPage = lazy(() =>
  import('@/pages/BillingPage').then((m) => ({ default: m.BillingPage })),
)
const InviteFriendsPage = lazy(() =>
  import('@/pages/InviteFriendsPage').then((m) => ({ default: m.InviteFriendsPage })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)
const SyncTranslatePage = lazy(() =>
  import('@/pages/SyncTranslatePage').then((m) => ({
    default: m.SyncTranslatePage,
  })),
)

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-zinc-500">
      Loading…
    </div>
  )
}

function LegacyProcessingRedirect() {
  const { jobId } = useParams<{ jobId: string }>()
  if (!jobId) return <Navigate to="/app/upload" replace />
  return (
    <Navigate
      to={`/app/jobs/${encodeURIComponent(jobId)}`}
      replace
    />
  )
}

function ReferralCaptureListener() {
  const { search } = useLocation()
  useEffect(() => {
    stashReferralCodeFromQuery(search)
  }, [search])
  return null
}

export function AppRouter() {
  return (
    <Suspense fallback={<PageFallback />}>
      <ReferralCaptureListener />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/translate" element={<SyncTranslatePage />} />
          <Route
            path="/pricing"
            element={<Navigate to={{ pathname: '/', hash: 'pricing' }} replace />}
          />
          <Route path="/auth/confirm" element={<AuthConfirmPage />} />
          <Route element={<GuestOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route path="/processing/:jobId" element={<LegacyProcessingRedirect />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
          <Route path="/app" element={<Navigate to="/app/upload" replace />} />
          <Route path="/app/dashboard" element={<Navigate to="/app/upload" replace />} />
          <Route path="/app/upload" element={<AppUploadPage />} />
          <Route path="/app/jobs/:jobId" element={<JobProgressPage />} />
          <Route path="/app/history" element={<HistoryPage />} />
          <Route
            path="/settings"
            element={<Navigate to="/app/settings" replace />}
          />
          <Route
            path="/billing"
            element={<Navigate to="/app/billing" replace />}
          />
          <Route path="/app/settings" element={<SettingsPage />} />
          <Route path="/app/billing" element={<BillingPage />} />
          <Route path="/app/invite" element={<InviteFriendsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
