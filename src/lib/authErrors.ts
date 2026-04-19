/** Map Supabase Auth errors to short UI messages. */
export function formatAuthError(error: { message?: string } | null): string {
  if (!error?.message) {
    return 'Something went wrong. Try again.'
  }
  const m = error.message
  if (/Invalid login credentials/i.test(m)) {
    return 'Invalid email or password.'
  }
  if (/Email not confirmed/i.test(m)) {
    return 'Please confirm your email before signing in.'
  }
  if (/User already registered/i.test(m)) {
    return 'An account with this email already exists. Try logging in.'
  }
  if (/Password should be at least/i.test(m)) {
    return 'Password does not meet requirements.'
  }
  if (/Unable to validate email address/i.test(m)) {
    return 'Enter a valid email address.'
  }
  if (/rate limit|too many requests/i.test(m)) {
    return 'Too many attempts. Wait a few minutes and try again.'
  }
  if (/JWT expired|session( has)? expired|invalid refresh token/i.test(m)) {
    return 'Your session expired. Sign in again or request a new reset link.'
  }
  return m
}
