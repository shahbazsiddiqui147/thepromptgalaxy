import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.SITE_URL ?? 'https://thepromptgalaxy.com'
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin/', '/login/', '/account/'] },
    sitemap: `${base}/sitemap.xml`,
  }
}
