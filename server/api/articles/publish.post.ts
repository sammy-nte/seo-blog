import { z } from 'zod'
import {
  assembleBlogArticle,
  editorialResponseSchema,
  finalGenerationRequestSchema,
  prepareFinalGeneration,
  validateEditorialNumbers
} from '#shared/utils/articleGeneration'
import { persistPublishedArticle } from '../../utils/articleRepository'

const publishRequestSchema = z.strictObject({
  request: finalGenerationRequestSchema,
  editorial: editorialResponseSchema,
  publishedAt: z.iso.datetime(),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(100)
})

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const origin = getHeader(event, 'origin')
  if (origin && origin !== getRequestURL(event).origin) {
    throw createError({ statusCode: 403, statusMessage: 'This action could not be completed.' })
  }
  const maxBytes = 12 * 1024 * 1024
  if (Number(getHeader(event, 'content-length')) > maxBytes) throw createError({ statusCode: 413, statusMessage: 'This file contains too much data to process. Please use a smaller file.' })
  const raw = await readRawBody(event)
  if (!raw || Buffer.byteLength(raw) > maxBytes) throw createError({ statusCode: 413, statusMessage: 'This article could not be published. Please try again.' })

  let body: unknown
  try { body = JSON.parse(raw) } catch {
    throw createError({ statusCode: 400, statusMessage: 'This article could not be published. Please try again.' })
  }
  const parsed = publishRequestSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'This article could not be published. Please generate it again.' })

  let prepared: ReturnType<typeof prepareFinalGeneration>
  try {
    prepared = prepareFinalGeneration(parsed.data.request)
    validateEditorialNumbers(parsed.data.editorial, prepared.context)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'This article could not be published. Please generate it again.' })
  }

  const article = assembleBlogArticle(
    parsed.data.request,
    parsed.data.editorial,
    prepared,
    new Date(parsed.data.publishedAt)
  )
  if (article.slug !== parsed.data.slug) {
    throw createError({ statusCode: 400, statusMessage: 'This article could not be published. Please generate it again.' })
  }
  await persistPublishedArticle(article, parsed.data.request)
  return { slug: article.slug, url: `/blog/${article.slug}` }
})
