/**
 * The served version 2 theme: asked by the app itself, as the web does
 * (the logic submodule asks `first_load` for the version 1 theme, which the
 * app no longer reads: docs/theme/decisions.md), and cached for the next
 * launch.
 *
 * The request carries `theme_version=2`, the schema's `product_type` and the
 * `theme_schema_version` this binary is built with: api-core cuts a theme of
 * a newer schema down to it.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { THEME_PRODUCT_TYPE, THEME_SCHEMA_VERSION, THEME_VERSION, isThemeEnvelope, type ThemeEnvelope } from './engine'

export const buildThemeUrl = (root: string) =>
  `${String(root || '').replace(/\/$/, '')}/theme?theme_version=${THEME_VERSION}&product_type=${THEME_PRODUCT_TYPE}&theme_schema_version=${THEME_SCHEMA_VERSION}`

/** The v2 envelope of a `GET theme` response (`result`, or `result.values` as v1 nests it), or null. */
export const extractTheme = (json: any): ThemeEnvelope | null => {
  if (!json || json.error) return null
  const result = json.result
  if (isThemeEnvelope(result)) return result
  if (isThemeEnvelope(result?.values)) return result.values
  return null
}

/** The envelope, or null on any failure (network, non-2xx, not JSON): never rejects. */
export const fetchTheme = async ({ root, appId, fetchImpl = fetch }: { root: string, appId?: string, fetchImpl?: typeof fetch }): Promise<ThemeEnvelope | null> => {
  try {
    const response = await fetchImpl(buildThemeUrl(root), { method: 'GET', headers: appId ? { 'X-App-X': appId } : {} })
    if (!response?.ok) return null
    return extractTheme(await response.json())
  } catch (_) {
    return null
  }
}

/** The cache key: one per project and per schema version of this binary. */
export const themeCacheKey = (project: string | null | undefined) =>
  `ordering_theme:v${THEME_VERSION}:${THEME_PRODUCT_TYPE}:${THEME_SCHEMA_VERSION}:${project || 'default'}`

export const readCachedTheme = async (project?: string | null): Promise<ThemeEnvelope | null> => {
  try {
    const raw = await AsyncStorage.getItem(themeCacheKey(project))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return isThemeEnvelope(parsed) ? parsed : null
  } catch (_) {
    return null
  }
}

export const writeCachedTheme = async (project: string | null | undefined, envelope: ThemeEnvelope) => {
  try {
    await AsyncStorage.setItem(themeCacheKey(project), JSON.stringify(envelope))
  } catch (_) {
    // a cache that cannot be written only costs the next launch a request
  }
}
