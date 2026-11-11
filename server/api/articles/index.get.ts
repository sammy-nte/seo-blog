import { loadPublishedArticleSummaries } from '../../utils/articleRepository'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'public, max-age=30, s-maxage=120')
  return loadPublishedArticleSummaries()
})
