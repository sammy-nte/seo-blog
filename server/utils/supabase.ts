import { createAdminClient } from '@supabase/server/core'

export function getSupabaseServerClient() {
  const config = useRuntimeConfig()
  if (!config.supabaseUrl || !config.supabaseSecretKey) {
    throw createError({ statusCode: 503, statusMessage: 'This service is temporarily unavailable. Please try again later.' })
  }
  return createAdminClient({
    env: {
      url: config.supabaseUrl,
      secretKeys: { default: config.supabaseSecretKey }
    }
  })
}
