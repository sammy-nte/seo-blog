import { createAdminClient } from '@supabase/server/core'

export function getSupabaseServerClient() {
  const config = useRuntimeConfig()
  if (!config.supabaseUrl || !config.supabaseSecretKey) {
    throw createError({ statusCode: 503, statusMessage: 'Supabase is not configured. Set the private URL and secret key server variables.' })
  }
  return createAdminClient({
    env: {
      url: config.supabaseUrl,
      secretKeys: { default: config.supabaseSecretKey }
    }
  })
}
