import { ApiError, GoogleGenAI } from '@google/genai'
import { z } from 'zod'
import {
  assembleBlogArticle,
  editorialResponseSchema,
  finalGenerationRequestSchema,
  prepareFinalGeneration,
  validateEditorialNumbers
} from '#shared/utils/articleGeneration'
import { articleGenerationSystemInstruction } from '../../prompts/articleGeneration'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const origin = getHeader(event, 'origin')
  if (origin && origin !== getRequestURL(event).origin) {
    throw createError({ statusCode: 403, statusMessage: 'This action could not be completed.' })
  }

  const maxBytes = 12 * 1024 * 1024
  if (Number(getHeader(event, 'content-length')) > maxBytes) {
    throw createError({ statusCode: 413, statusMessage: 'This file contains too much data to process. Please use a smaller file.' })
  }
  const raw = await readRawBody(event)
  if (!raw || Buffer.byteLength(raw) > maxBytes) throw createError({ statusCode: 413, statusMessage: 'This file could not be processed. Please try another file.' })

  let body: unknown
  try { body = JSON.parse(raw) } catch {
    throw createError({ statusCode: 400, statusMessage: 'We could not process this request. Please try again.' })
  }
  const requestResult = finalGenerationRequestSchema.safeParse(body)
  if (!requestResult.success) {
    throw createError({ statusCode: 400, statusMessage: 'We could not process the selected data. Please review your choices and try again.' })
  }

  const config = useRuntimeConfig(event)
  if (!config.geminiApiKey) throw createError({ statusCode: 503, statusMessage: 'Article generation is temporarily unavailable. Please try again later.' })

  let prepared: ReturnType<typeof prepareFinalGeneration>
  try { prepared = prepareFinalGeneration(requestResult.data) } catch {
    throw createError({ statusCode: 400, statusMessage: 'We could not process the selected data. Please review your choices and try again.' })
  }

  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey, httpOptions: { timeout: 60_000 } })
  let responseText: string | undefined
  try {
    const response = await ai.models.generateContent({
      model: config.geminiModel,
      contents: JSON.stringify(prepared.context),
      config: {
        systemInstruction: articleGenerationSystemInstruction,
        responseMimeType: 'application/json',
        responseJsonSchema: z.toJSONSchema(editorialResponseSchema),
        maxOutputTokens: 8_192
      }
    })
    responseText = response.text
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      throw createError({ statusCode: 429, statusMessage: 'Article generation is temporarily unavailable. Please try again shortly.' })
    }
    throw createError({ statusCode: 502, statusMessage: 'The article could not be generated. Please try again.' })
  }

  let editorial
  try {
    editorial = editorialResponseSchema.parse(JSON.parse(responseText ?? ''))
    validateEditorialNumbers(editorial, prepared.context)
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'The article could not be generated. Please try again.' })
  }

  const article = assembleBlogArticle(requestResult.data, editorial, prepared)
  return { article, editorial }
})
