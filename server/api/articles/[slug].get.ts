import { loadPublishedArticle } from '../../utils/articleRepository'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'public, max-age=60, s-maxage=300')
  const slug = getRouterParam(event, 'slug')
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) throw createError({ statusCode: 404, statusMessage: 'Article not found.' })
  const article = await loadPublishedArticle(slug)
  if (!article) throw createError({ statusCode: 404, statusMessage: 'Article not found.' })
  return article
})
