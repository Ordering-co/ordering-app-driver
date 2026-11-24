/**
 * Builds the app's theme from a served version 2 theme (or none):
 *
 *   { values, native, meta }
 *
 * - `values`: the served values completed by the engine's runtime (`complete`
 *   of @orderingco/ordering-theme-engine/runtime) with src/theme.compiled.json:
 *   every key of the schema, values it does not understand replaced by the
 *   default, numbers clamped. Without a theme (first launch offline, an error)
 *   it is the build's defaults.
 * - `native`: the same values as React Native style values (`toNative` of
 *   @orderingco/ordering-theme-engine/native), built once per theme.
 * - `meta`: what the envelope says about itself.
 *
 * Never change the result: its objects are shared.
 */
import { complete } from '@orderingco/ordering-theme-engine/runtime'
import { toNative } from '@orderingco/ordering-theme-engine/native'
import COMPILED from '../theme.compiled.json'

export const THEME_VERSION = 2
export const THEME_PRODUCT_TYPE: string = (COMPILED as any).product_type
export const THEME_SCHEMA_VERSION: string = (COMPILED as any).version

export interface ThemeEnvelope {
  version: 2
  values: Record<string, unknown>
  product_type?: string
  schema_version?: string
  preset?: string | null
  site_theme_id?: number | null
  updated_at?: string | null
}

const isObject = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value)

/** A served version 2 theme for this app's product (another product's is ignored). */
export const isThemeEnvelope = (value: unknown): value is ThemeEnvelope =>
  isObject(value) && value.version === THEME_VERSION && isObject(value.values) &&
  (value.product_type === undefined || value.product_type === THEME_PRODUCT_TYPE)

const meta = (envelope: ThemeEnvelope | null) => ({
  /** The system's reduce-motion setting (AppThemeProvider sets it): no theme motion. */
  reduceMotion: false,
  productType: envelope?.product_type ?? THEME_PRODUCT_TYPE,
  schemaVersion: envelope?.schema_version ?? THEME_SCHEMA_VERSION,
  preset: envelope?.preset ?? null,
  siteThemeId: envelope?.site_theme_id ?? null,
  updatedAt: envelope?.updated_at ?? null
})

const build = (envelope: ThemeEnvelope | null) => {
  const values = complete(COMPILED as any, envelope?.values ?? null) as any
  return { values, native: toNative(COMPILED as any, values) as any, meta: meta(envelope) }
}

export type AppTheme = ReturnType<typeof build>

const built = new WeakMap<object, AppTheme>()
let defaults: AppTheme | null = null

/** The build's defaults: what the binary paints before a theme arrives and offline. */
export const defaultAppTheme = (): AppTheme => (defaults ??= build(null))

/** The app theme of an envelope, built once per envelope; anything it cannot read gives the defaults. */
export const buildAppTheme = (envelope: unknown): AppTheme => {
  if (!isThemeEnvelope(envelope)) return defaultAppTheme()
  let theme = built.get(envelope)
  if (!theme) {
    try {
      theme = build(envelope)
    } catch (_) {
      theme = defaultAppTheme()
    }
    built.set(envelope, theme)
  }
  return theme
}
