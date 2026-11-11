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
      statusMessage: "This action could not be completed.",
    });
  }

  const maxBytes = 256 * 1024;

  if (Number(getHeader(event, "content-length")) > maxBytes) {
    throw createError({
      statusCode: 413,
      statusMessage:
        "This file contains too much data to process. Please use a smaller file.",
    });
  }

  const raw = await readRawBody(event);

  if (!raw || Buffer.byteLength(raw) > maxBytes) {
    throw createError({
      statusCode: 413,
      statusMessage: "This file could not be processed. Please try another file.",
    });
  }

  let body: unknown;

  try {
    body = JSON.parse(raw);
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "We could not process this data. Please try again.",
    });
  }

  const parsed = suggestionPayloadSchema.safeParse(body);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "We could not process this data. Please check the file and try again.",
    });
  }

  const config = useRuntimeConfig(event);

  if (!config.geminiApiKey) {
    throw createError({
      statusCode: 503,
      statusMessage: "Suggestions are temporarily unavailable. Please try again later.",
    });
  }

  if (!config.geminiModel) {
    throw createError({
      statusCode: 503,
      statusMessage: "Suggestions are temporarily unavailable. Please try again later.",
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
          statusMessage: "Suggestions are temporarily unavailable. Please try again shortly.",
        });
      }

      if (error.status === 503 || error.status === 504) {
        throw createError({
          statusCode: 503,
          statusMessage: "Suggestions are temporarily unavailable. Please try again shortly.",
        });
      }
    }

    throw createError({
      statusCode: 502,
      statusMessage: "Suggestions could not be prepared. Please try again.",
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
      statusMessage: "Suggestions could not be prepared. Please try again.",
    });
  }
});
