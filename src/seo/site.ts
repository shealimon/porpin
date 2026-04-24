/** Public site origin for canonical URLs, Open Graph, and sitemap (no trailing slash). */
export const SITE_ORIGIN = (() => {
  const fromEnv = import.meta.env.VITE_SITE_ORIGIN?.replace(/\/$/, '').trim()
  if (fromEnv) return fromEnv
  // Local `npm run dev`: avoid pointing SEO at production. Production build: porpin.com.
  if (import.meta.env.DEV) return 'http://localhost:5173'
  return 'https://www.porpin.com'
})()
