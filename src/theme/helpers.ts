/**
 * How components read the theme. Every visual value comes from here: no hex,
 * no number for a space, radius, size, font size or shadow, no fontFamily
 * and no fontWeight in a component (docs/THEMING.md).
 *
 * The names mirror the web's helpers; they return React Native values
 * (numbers in pt, style objects) instead of CSS. Each one has a template twin
 * (`…Css`) for styled-components/native templates, which need CSS text: a
 * component never writes a unit after an interpolation.
 *
 *   const styles = useMemo(() => StyleSheet.create({ box: { padding: themeSpace(theme, 'md') } }), [theme])
 *   const Box = styled.View`padding: ${({ theme }) => spaceCss(theme, 'md')};`
 */
import { Easing, Platform } from 'react-native'
import { nearestWeight } from '@orderingco/ordering-theme-engine/native'
import type { AppTheme } from './engine'
import { BUNDLED_IMAGES, IMAGE_FALLBACKS } from './bundledImages'

type Theme = AppTheme | any

export type ColorName = string
export type SpaceLevel = 'none' | 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl'
export type RadiusLevel = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'full'
export type ShadowLevel = 'none' | 'sm' | 'md' | 'lg' | 'xl'
export type SizeLevel = 'sm' | 'md' | 'lg' | 'xl'
export type IconLevel = 'sm' | 'md' | 'lg'
export type BorderLevel = 'thin' | 'thick'
export type TextPreset = 'h1' | 'h2' | 'h3' | 'h4' | 'body_lg' | 'body' | 'body_sm' | 'caption' | 'label' | 'button'
export type MotionLevel = 'fast' | 'base' | 'slow'

const HEADINGS = ['display', 'h1', 'h2', 'h3', 'h4']
const px = (value: number) => `${value}px`
const tokens = (theme: Theme) => theme.native.tokens

// ── Values ──────────────────────────────────────────────────────────────

export const themeColor = (theme: Theme, name: ColorName): string => tokens(theme).color[name]

export const themeSpace = (theme: Theme, level: SpaceLevel): number => tokens(theme).space[level]

export const themeGutter = (theme: Theme): number => tokens(theme).layout.page_gutter

/** A radius level as Identity paints it; `fixed` keeps the level's own value (states, round shapes). */
export const themeRadius = (theme: Theme, level: RadiusLevel, { fixed = false } = {}): number =>
  (fixed ? tokens(theme).radius : theme.native.identity.radius)[level]

export const themeBorderWidth = (theme: Theme, level: BorderLevel, { fixed = false } = {}): number =>
  (fixed ? tokens(theme).border : theme.native.identity.border)[level]

/** `{ borderWidth, borderStyle, borderColor }` of a level and a color. */
export const themeBorder = (theme: Theme, level: BorderLevel, color: ColorName = 'border', { fixed = false } = {}) => {
  const width = themeBorderWidth(theme, level, { fixed })
  return width === 0 ? { borderWidth: 0 } : { borderWidth: width, borderStyle: (theme.native.identity.border_style ?? 'solid') as any, borderColor: themeColor(theme, color) }
}

/** A shadow level as both platforms paint it (iOS `shadow*`, Android `elevation`). */
export const themeShadow = (theme: Theme, level: ShadowLevel, { fixed = false } = {}) => {
  const { shadowColor, shadowOpacity, shadowRadius, shadowOffset, elevation } = (fixed ? tokens(theme).shadow : theme.native.identity.shadow)[level]
  return { shadowColor, shadowOpacity, shadowRadius, shadowOffset, elevation }
}

/**
 * A component as a group sees it: the group's own look of it (`scope`, what the
 * theme changes for that group's tabs, choices, checkboxes…) or the global one.
 */
export const themeScoped = (theme: Theme, group: string, name: string): any =>
  theme.native.components[group]?.scope?.[name] ?? theme.native.components[name]

export const themeControlHeight = (theme: Theme, level: SizeLevel): number => tokens(theme).size[level]

export const themeIconSize = (theme: Theme, level: IconLevel): number => tokens(theme).icon[level]

export const themeOpacity = (theme: Theme, name: 'disabled' | 'pressed'): number => tokens(theme).opacity[name]

/** The font file of a role at a weight (the nearest bundled one). */
export const themeFontFamily = (theme: Theme, role: 'heading' | 'body', weight: number | string = 400): string | undefined => {
  const font = theme.native.fonts[role]
  if (!font) return undefined
  const weights = Object.keys(font.files).map(Number)
  return font.files[nearestWeight(weight === 'bold' ? 700 : weight === 'normal' ? 400 : weight, weights) ?? 400]
}

/** A font face as a style that carries only the file of a weight (no `fontWeight`): what a library asks of a theme's fonts. */
export const themeFontFace = (theme: Theme, role: 'heading' | 'body', weight: number | string = 400) =>
  ({ fontFamily: themeFontFamily(theme, role, weight) })

/**
 * A typography preset as a text style: `{ fontFamily, fontSize, lineHeight,
 * letterSpacing?, textTransform? }`. `weight` keeps a block's own weight
 * (a bold name in body size) through the font file, never `fontWeight`.
 */
export const themeText = (theme: Theme, preset: TextPreset, { weight }: { weight?: number | string } = {}) => {
  const { fontFamily, fontSize, lineHeight, letterSpacing, textTransform } = tokens(theme).typography[preset]
  const style = { fontFamily, fontSize, lineHeight, ...(letterSpacing !== undefined && { letterSpacing }), ...(textTransform !== undefined && { textTransform }) }
  if (weight === undefined) return style
  const role = HEADINGS.includes(preset) ? 'heading' : 'body'
  return { ...style, fontFamily: themeFontFamily(theme, role, weight) }
}

export const themeMotion = (theme: Theme, level: MotionLevel) => {
  const [x1, y1, x2, y2] = theme.native.easing
  // No motion when the theme turns it off or the system asks to reduce it.
  const enabled = theme.values.tokens.motion_style.enabled !== false && !theme.meta.reduceMotion
  return { duration: enabled ? tokens(theme).motion[level] : 0, easing: Easing.bezier(x1, y1, x2, y2) }
}

/** A component's value as React Native takes it: `themePart(theme, 'button', 'sizes.md.height')`. */
export const themePart = (theme: Theme, component: string, path: string): any =>
  path.split('.').reduce((node: any, key) => node?.[key], theme.native.components[component])

/** A completed value as the theme has it (options, booleans, sections): `themeValue(theme, 'tokens.layout.mode')`. */
export const themeValue = (theme: Theme, path: string): any =>
  path.split('.').reduce((node: any, key) => node?.[key], theme.values)

/** Whether a piece is shown: a key the theme does not know is shown. */
export const themeVisible = (theme: Theme, key: string): boolean => theme.values.visibility[key] !== false

/**
 * How titles align (`section_header.base.align`: start, center, end) as a
 * `textAlign`: page and section titles, the header bar's and the store's, all
 * the same (start is the reading side, also in right-to-left).
 */
export const themeTitleAlign = (theme: Theme): 'auto' | 'center' | 'right' =>
  ({ start: 'auto', center: 'center', end: 'right' } as const)[theme.native.components.section_header.base.align as 'start' | 'center' | 'end'] ?? 'auto'

/**
 * The space under a bottom bar's content: the system's bottom inset, but never
 * less than `min`. The inset is 0 on Android with gesture navigation (and
 * `MainActivity` pads the content over the navigation bar, so JS sees 0 there
 * in every mode): without a minimum the bar's content sits on the screen's edge.
 */
export const bottomSpace = (inset: number, min: number): number => Math.max(inset, min)

/** `bottomSpace` with the theme's minimum (`bottom_nav.base.min_bottom_space`, shared by every bottom bar). */
export const themeBottomSpace = (theme: Theme, inset = 0): number =>
  bottomSpace(inset, theme.native.components.bottom_nav.base.min_bottom_space)

/**
 * The space under a pinned action bar's content (`FloatingButton`, and the rooms that reserve its height): its
 * own padding comes on top, so with it the gap between a button and the system's navigation area is the same on
 * every screen. On iOS it is `themeBottomSpace`: the inset, never less than the minimum (a device with no home
 * indicator would put the buttons on the screen's edge). On Android the activity already pads its screens by the
 * system bars, so a screen reads inset 0 and its bar stands clear above the navigation area: a minimum on top of
 * that put a second space under the bar of the stack's screens (Information, the access screens, the order's
 * details) that the modals' bars (the reason forms, the review, whose window reads the real inset) did not have.
 * There the bar keeps the inset it reads, whatever it is.
 */
export const barBottomSpace = (theme: Theme, inset = 0): number =>
  Platform.OS === 'android' ? inset : themeBottomSpace(theme, inset)

/**
 * A bar pinned to the bottom: its height (`height` over the space under it and
 * `growth`, what its text adds at a larger system font) and the padding that
 * keeps its content off the edge (`padding` over that space).
 */
export const bottomBarBox = ({ height, padding, inset, min, growth = 0 }: { height: number, padding: number, inset: number, min: number, growth?: number }) => {
  const space = bottomSpace(inset, min)
  return { height: height + space + growth, paddingBottom: space + padding }
}

/**
 * The height of the bottom bar (`components.bottom_bar`) with `buttons` buttons:
 * each at the height of the bar's button slot, `sm` apart, the bar's padding
 * above and below and the space under it (the bottom safe-area inset or the
 * theme's minimum). `bottomSpace` replaces that space when the screen already
 * knows it (`useFloatingButtonInset`: 0 inside the bottom tabs).
 */
export const bottomBarHeight = (theme: Theme, bottomInset = 0, buttons = 1, bottomSpaceOverride?: number): number => {
  const bar = theme.native.components.bottom_bar
  const button = theme.native.components.button.sizes[bar.slots.button.size].height
  return buttons * button + (buttons - 1) * themeSpace(theme, 'sm') +
    2 * bar.base.padding + (bottomSpaceOverride ?? barBottomSpace(theme, bottomInset))
}

/**
 * The room a scroll leaves under its content for the bottom bar laid over it:
 * the bar's height and a block's space (`xl`).
 */
export const bottomBarClearance = (theme: Theme, bottomInset = 0, buttons = 1): number =>
  bottomBarHeight(theme, bottomInset, buttons) + themeSpace(theme, 'xl')

/** An image as an `Image` source: the theme's URL, or the binary's own. */
export const themeImage = (theme: Theme, key: string) => {
  const url = theme.values.images[key]
  if (url) return { uri: url }
  const path = IMAGE_FALLBACKS[key]
  if (!path) return undefined
  const [group, name] = path.split('.')
  return BUNDLED_IMAGES[group]?.[name]
}

const without = (object: Record<string, any>, key: string) =>
  Object.fromEntries(Object.entries(object).filter(([name]) => name !== key))

/**
 * A shadow of `toNative` (or none) as a View style: iOS `shadow*` and Android
 * `elevation`, without the CSS `boxShadow` it also carries.
 */
export const nativeShadowStyle = (shadow: Record<string, any> | null | undefined) => {
  if (!shadow) return {}
  return without(shadow, 'boxShadow')
}

/** A text look of `toNative` as a Text style, without its `weight` (painted by the file). */
export const nativeTextStyle = (text: Record<string, any>) => without(text, 'weight')

/**
 * Whether a color is opaque: a shadow needs an opaque background under it (on
 * iOS one under a see-through view cannot be computed and logs an advice; on
 * Android it shows through as a grey box).
 */
export const isOpaque = (color: unknown): boolean => {
  if (typeof color !== 'string' || !color) return false
  const c = color.replace(/\s/g, '').toLowerCase()
  if (c === 'transparent') return false
  const rgba = c.match(/^rgba\([^,]+,[^,]+,[^,]+,([0-9.]+)\)$/)
  if (rgba) return parseFloat(rgba[1]) >= 1
  const hex8 = c.match(/^#[0-9a-f]{6}([0-9a-f]{2})$/)
  if (hex8) return parseInt(hex8[1], 16) === 255
  return true
}

/**
 * A box look of a component (`background`, `border`, `shadow`) as a View
 * style. A see-through background (an outline or ghost button, an underline
 * tab track, a color with alpha the editor chose) drops the shadow; a look
 * without a background (a state over its base, a bar whose background is set
 * apart) keeps it.
 */
export const nativeBoxStyle = (look: Record<string, any>) => ({
  ...(look.background !== undefined && look.background !== null && { backgroundColor: look.background }),
  ...(look.border ?? {}),
  ...(look.background === undefined || look.background === null || isOpaque(look.background) ? nativeShadowStyle(look.shadow) : {}),
})

/**
 * The border room of a control whose states differ (a chip, a category tile):
 * every state draws the widest border of `looks` (`toNative` borders), see-through
 * where the state (and `base`) has none, so a state changes the color, never
 * the size or the position. `ring(look, base)` is that state's border style;
 * with no border in any state it is empty.
 */
export const reservedBorder = (looks: Array<Record<string, any> | null | undefined>) => {
  const width = Math.max(0, ...looks.map((look) => look?.border?.borderWidth ?? 0))
  return (look: Record<string, any> | null | undefined, base?: Record<string, any> | null) => {
    if (width === 0) return {}
    const border = look?.border ?? base?.border
    return {
      borderWidth: width,
      borderStyle: border?.borderStyle ?? 'solid',
      borderColor: border?.borderColor ?? 'transparent',
    }
  }
}

// ── Template twins (styled-components/native) ───────────────────────────

export const spaceCss = (theme: Theme, level: SpaceLevel) => px(themeSpace(theme, level))
export const gutterCss = (theme: Theme) => px(themeGutter(theme))
export const radiusCss = (theme: Theme, level: RadiusLevel, options?: { fixed?: boolean }) => px(themeRadius(theme, level, options))
export const controlHeightCss = (theme: Theme, level: SizeLevel) => px(themeControlHeight(theme, level))
export const iconSizeCss = (theme: Theme, level: IconLevel) => px(themeIconSize(theme, level))

export const borderCss = (theme: Theme, level: BorderLevel, color: ColorName = 'border', options?: { fixed?: boolean }) => {
  const border: any = themeBorder(theme, level, color, options)
  return border.borderWidth === 0
    ? 'border-width: 0px;'
    : `border-width: ${px(border.borderWidth)}; border-style: ${border.borderStyle}; border-color: ${border.borderColor};`
}

export const shadowCss = (theme: Theme, level: ShadowLevel, options?: { fixed?: boolean }) => {
  const s = themeShadow(theme, level, options)
  return `shadow-color: ${s.shadowColor}; shadow-opacity: ${s.shadowOpacity}; shadow-radius: ${px(s.shadowRadius)}; shadow-offset: ${px(s.shadowOffset.width)} ${px(s.shadowOffset.height)}; elevation: ${s.elevation};`
}

export const textCss = (theme: Theme, preset: TextPreset, options?: { weight?: number | string }) => {
  const s: any = themeText(theme, preset, options)
  return [
    s.fontFamily ? `font-family: ${s.fontFamily};` : '',
    s.fontSize != null ? `font-size: ${px(s.fontSize)};` : '',
    s.lineHeight != null ? `line-height: ${px(s.lineHeight)};` : '',
    s.letterSpacing != null ? `letter-spacing: ${px(s.letterSpacing)};` : '',
    s.textTransform ? `text-transform: ${s.textTransform};` : ''
  ].filter(Boolean).join(' ')
}
