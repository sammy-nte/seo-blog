import { absoluteUrl, getSiteOrigin } from '../utils/siteUrl'

export default defineEventHandler((event) => {
  const origin = getSiteOrigin(event)
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=300, s-maxage=86400')
  return `User-agent: *\nAllow: /\n\nSitemap: ${absoluteUrl(origin, '/sitemap.xml')}\n`
})
