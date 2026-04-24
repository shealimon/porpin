import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'

import { SITE_ORIGIN } from './site'
import { resolveSeo } from './resolveSeo'

export function DocumentMeta() {
  const { pathname } = useLocation()
  const seo = resolveSeo(pathname)
  const canonicalUrl =
    seo.canonicalPath === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${seo.canonicalPath}`

  return (
    <Helmet prioritizeSeoTags htmlAttributes={{ lang: 'en' }}>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      {seo.robots ? (
        <meta name="robots" content={seo.robots} />
      ) : (
        <meta name="robots" content="index, follow" />
      )}
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:locale" content="en_US" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      {seo.jsonLd ? (
        <script type="application/ld+json">{JSON.stringify(seo.jsonLd)}</script>
      ) : null}
    </Helmet>
  )
}
