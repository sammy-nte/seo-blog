import type { MaybeRefOrGetter } from 'vue'

export function useSiteUrl() {
  const config = useRuntimeConfig()
  const requestUrl = useRequestURL()

  return computed(() => {
    const configuredUrl = String(config.public.siteUrl || '').trim()
    const baseUrl = configuredUrl || requestUrl.origin
    return new URL(baseUrl).origin
  })
}

export function useCanonicalUrl() {
  const route = useRoute()
  const siteUrl = useSiteUrl()

  return computed(() => {
    const path = route.path === '/' ? '/' : route.path.replace(/\/+$/, '')
    return new URL(path, `${siteUrl.value}/`).toString()
  })
}

export function useAbsoluteSiteUrl(path: MaybeRefOrGetter<string>) {
  const siteUrl = useSiteUrl()
  return computed(() => new URL(toValue(path), `${siteUrl.value}/`).toString())
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
