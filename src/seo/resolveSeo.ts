import { SITE_ORIGIN } from './site'

export const DEFAULT_TITLE = 'Porpin — Hinglish for books & documents'

export const DEFAULT_DESCRIPTION =
  'Porpin turns books and documents into natural Hinglish. Upload a file, review the translation, and export—one workspace for readable bilingual content.'

export type SeoModel = {
  title: string
  description: string
  /** Canonical path only (leading slash). Full URL = SITE_ORIGIN + canonicalPath */
  canonicalPath: string
  robots?: string
  jsonLd?: Record<string, unknown>
}

function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_ORIGIN}/#organization`,
        name: 'Porpin',
        url: SITE_ORIGIN,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_ORIGIN}/#website`,
        url: SITE_ORIGIN,
        name: 'Porpin',
        description: DEFAULT_DESCRIPTION,
        publisher: { '@id': `${SITE_ORIGIN}/#organization` },
        inLanguage: 'en',
      },
    ],
  }
}

export function resolveSeo(pathname: string): SeoModel {
  if (pathname.startsWith('/app')) {
    return {
      title: 'Porpin',
      description: DEFAULT_DESCRIPTION,
      canonicalPath: pathname,
      robots: 'noindex, nofollow',
    }
  }

  if (pathname.startsWith('/processing/')) {
    return {
      title: 'Porpin',
      description: DEFAULT_DESCRIPTION,
      canonicalPath: pathname,
      robots: 'noindex, nofollow',
    }
  }

  switch (pathname) {
    case '/':
      return {
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        canonicalPath: '/',
        jsonLd: websiteJsonLd(),
      }
    case '/translate':
      return {
        title: 'Hinglish translate — Porpin',
        description:
          'Upload PDF, DOCX, EPUB, or TXT and download natural Hinglish in Roman script. Fast document translation from Porpin.',
        canonicalPath: '/translate',
      }
    case '/login':
      return {
        title: 'Log in — Porpin',
        description: 'Sign in to Porpin to upload documents and manage Hinglish translations.',
        canonicalPath: '/login',
      }
    case '/signup':
      return {
        title: 'Sign up — Porpin',
        description: 'Create a Porpin account to translate books and documents into natural Hinglish.',
        canonicalPath: '/signup',
      }
    case '/forgot-password':
      return {
        title: 'Forgot password — Porpin',
        description: 'Reset your Porpin account password.',
        canonicalPath: '/forgot-password',
      }
    case '/reset-password':
      return {
        title: 'Reset password — Porpin',
        description: 'Choose a new password for your Porpin account.',
        canonicalPath: '/reset-password',
        robots: 'noindex, nofollow',
      }
    case '/auth/confirm':
      return {
        title: 'Confirm email — Porpin',
        description: 'Confirm your Porpin account email address.',
        canonicalPath: '/auth/confirm',
        robots: 'noindex, nofollow',
      }
    default:
      return {
        title: 'Page not found — Porpin',
        description: 'The page you requested could not be found.',
        canonicalPath: pathname,
        robots: 'noindex, nofollow',
      }
  }
}
