import type { H3Event } from 'h3'

export function getSiteOrigin(event: H3Event) {
  const config = useRuntimeConfig(event)
  const configuredUrl = String(config.public.siteUrl || '').trim()
  return new URL(configuredUrl || getRequestURL(event).origin).origin
}

export function absoluteUrl(origin: string, path: string) {
  return new URL(path, `${origin}/`).toString()
}
