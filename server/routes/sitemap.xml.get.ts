import { loadPublishedArticleSummaries } from '../utils/articleRepository'
import { absoluteUrl, getSiteOrigin } from '../utils/siteUrl'

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export default defineEventHandler(async (event) => {
  const origin = getSiteOrigin(event)
  const articles = await loadPublishedArticleSummaries()
  const staticPages = ['/', '/blog', '/upload'].map(path => ({
    location: absoluteUrl(origin, path),
    lastModified: undefined as string | undefined
  }))
  const articlePages = articles.map(article => ({
    location: absoluteUrl(origin, `/blog/${encodeURIComponent(article.slug)}`),
    lastModified: article.publishedAt
  }))
  const entries = [...staticPages, ...articlePages]
    .map(({ location, lastModified }) => [
      '  <url>',
      `    <loc>${escapeXml(location)}</loc>`,
      ...(lastModified ? [`    <lastmod>${escapeXml(new Date(lastModified).toISOString())}</lastmod>`] : []),
      '  </url>'
    ].join('\n'))
    .join('\n')

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=300, s-maxage=3600')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`
})
