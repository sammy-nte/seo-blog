import { GoogleGenAI, ApiError } from "@google/genai";
import {
  suggestionPayloadSchema,
  validateRecommendation,
  recommendationSchema
} from "#shared/utils/suggestions";
import { suggestionsSystemInstruction } from "../prompts/suggestions";
import z from "zod";

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");

  const origin = getHeader(event, "origin");

  if (origin && origin !== getRequestURL(event).origin) {
    throw createError({
      statusCode: 403,
      statusMessage: "Suggestions must be requested from this application.",
    });
  }

  const maxBytes = 256 * 1024;

  if (Number(getHeader(event, "content-length")) > maxBytes) {
    throw createError({
      statusCode: 413,
      statusMessage:
        "The prepared dataset is too large. Please use fewer columns or shorter sample values.",
    });
  }

  const raw = await readRawBody(event);

  if (!raw || Buffer.byteLength(raw) > maxBytes) {
    throw createError({
      statusCode: 413,
      statusMessage: "The prepared dataset is empty or too large.",
    });
  }

  let body: unknown;

  try {
    body = JSON.parse(raw);
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "Please submit a valid JSON dataset.",
    });
  }

  const parsed = suggestionPayloadSchema.safeParse(body);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "The prepared dataset is invalid. Check the columns and numerical candidates, then try again.",
    });
  }

  const config = useRuntimeConfig(event);

  if (!config.geminiApiKey) {
    throw createError({
      statusCode: 503,
      statusMessage:
        "Suggestions are not configured. Set NUXT_GEMINI_API_KEY on the server.",
    });
  }

  if (!config.geminiModel) {
    throw createError({
      statusCode: 503,
      statusMessage:
        "Gemini model is not configured. Set NUXT_GEMINI_MODEL on the server.",
    });
  }

  const ai = new GoogleGenAI({
    apiKey: config.geminiApiKey,
    httpOptions: {
      timeout: 120000,
    },
  });

  const requestGemini = async () => {
    return ai.models.generateContent({
      model: config.geminiModel,
      contents: JSON.stringify(parsed.data),
      config: {
        systemInstruction: suggestionsSystemInstruction,
        responseJsonSchema: z.toJSONSchema(recommendationSchema),
        responseMimeType: "application/json",
        maxOutputTokens: 4096,
      },
    });
  };

  let responseText: string | undefined;

  try {
    let response;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await requestGemini();
        break;
      } catch (error) {
        const retryable =
          error instanceof ApiError &&
          (error.status === 503 || error.status === 504);

        if (!retryable || attempt === 2) {
          throw error;
        }

        const delay = 1500 * 2 ** attempt;

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    responseText = response?.text;
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 429) {
        throw createError({
          statusCode: 429,
          statusMessage:
            "Gemini is currently rate limited or out of quota.",
        });
      }

      if (error.status === 503 || error.status === 504) {
        throw createError({
          statusCode: 503,
          statusMessage:
            "Gemini is temporarily busy. Please try again.",
        });
      }
    }

    throw createError({
      statusCode: 502,
      statusMessage: "Gemini could not complete the request.",
    });
  }

  try {
    return validateRecommendation(
      JSON.parse(responseText ?? ""),
      parsed.data,
    );
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage:
        "Gemini returned an incomplete or unsupported recommendation. Please try again.",
    });
  }
});
