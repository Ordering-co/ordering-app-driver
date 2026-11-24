import AsyncStorage from '@react-native-async-storage/async-storage'
import { complete } from '@orderingco/ordering-theme-engine/runtime'
import COMPILED from '../../theme.compiled.json'
import SCHEMA from '../../../product.schema.json'
import { buildAppTheme, defaultAppTheme, isThemeEnvelope, THEME_PRODUCT_TYPE, THEME_SCHEMA_VERSION } from '../engine'
import { buildThemeUrl, extractTheme, fetchTheme, readCachedTheme, themeCacheKey, writeCachedTheme } from '../remote'
import {
  borderCss, shadowCss, spaceCss, textCss, themeBorder, themeColor, themeControlHeight, themeFontFamily, themeImage,
  themeMotion, themePart, themeRadius, themeShadow, themeSpace, themeText, themeValue, themeVisible
} from '../helpers'

const envelope = (values: any, extra: any = {}) => ({ version: 2, product_type: THEME_PRODUCT_TYPE, values, ...extra })
const themed = (tokens: any) => buildAppTheme(envelope({ tokens }))

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'))

describe('the compiled schema', () => {
  it('is the schema this build sends as product_type and theme_schema_version', () => {
    expect((COMPILED as any).product_type).toBe((SCHEMA as any).product_type)
    expect((COMPILED as any).version).toBe((SCHEMA as any).version)
    expect(THEME_PRODUCT_TYPE).toBe('driver_app')
    expect(THEME_SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })
})

describe('buildAppTheme()', () => {
  it('paints the build\'s defaults without a theme', () => {
    const theme = defaultAppTheme()
    expect(theme.values).toEqual(complete(COMPILED as any, null))
    expect(buildAppTheme(null)).toBe(theme)
    expect(buildAppTheme({ version: 1, values: {} })).toBe(theme)
  })

  it('ignores another product\'s theme', () => {
    expect(isThemeEnvelope(envelope({}, { product_type: 'marketplace_website' }))).toBe(false)
    expect(buildAppTheme(envelope({ tokens: { color: { primary: '#FF0000' } } }, { product_type: 'kiosk_app' }))).toBe(defaultAppTheme())
  })

  it('completes a partial theme and builds it once per envelope', () => {
    const served = envelope({ tokens: { color: { primary: '#FF0000' }, space: { md: 18 } } })
    const theme = buildAppTheme(served)
    expect(buildAppTheme(served)).toBe(theme)
    expect(themeColor(theme, 'primary')).toBe('#FF0000')
    expect(themeSpace(theme, 'md')).toBe(18)
    expect(themeColor(theme, 'text')).toBe(themeColor(defaultAppTheme(), 'text'))
  })

  it('survives values it does not understand: they take the defaults', () => {
    const theme = buildAppTheme(envelope({ tokens: { color: { primary: 'not a color' }, space: { md: 'big' }, radius: { md: 99999 } }, components: 'nope', visibility: { 'orders.title': 'yes' } }))
    expect(themeColor(theme, 'primary')).toBe(themeColor(defaultAppTheme(), 'primary'))
    expect(themeSpace(theme, 'md')).toBe(themeSpace(defaultAppTheme(), 'md'))
    expect(typeof themeRadius(theme, 'md', { fixed: true })).toBe('number')
    expect(themeVisible(theme, 'orders.title')).toBe(true)
  })
})

describe('the theme has no legacy shape', () => {
  it('is only values, native and meta', () => {
    expect(Object.keys(defaultAppTheme()).sort()).toEqual(['meta', 'native', 'values'])
  })
})

describe('helpers', () => {
  const theme = defaultAppTheme()

  it('read numbers in pt and style objects', () => {
    expect(themeSpace(theme, 'lg')).toBe(20)
    expect(themeControlHeight(theme, 'md')).toBe(44)
    expect(themeRadius(theme, 'sm')).toBe(themeRadius(theme, 'md'))
    expect(themeRadius(theme, 'sm', { fixed: true })).toBe(8)
    expect(themeRadius(theme, 'full')).toBe(9999)
    expect(themeShadow(theme, 'md')).toEqual(expect.objectContaining({ shadowOffset: expect.any(Object), elevation: expect.any(Number) }))
    expect(themeShadow(theme, 'md')).not.toHaveProperty('boxShadow')
    // Identity draws the lines by default (the mockups'): its thin level is the border's.
    expect(themeBorder(theme, 'thin')).toEqual({ borderWidth: 1, borderStyle: 'solid', borderColor: themeColor(theme, 'border') })
    expect(themeBorder(themed({ border_style: { width: 'none' } }), 'thin')).toEqual({ borderWidth: 0 })
    expect(themeBorder(theme, 'thin', 'border', { fixed: true })).toEqual({ borderWidth: 1, borderStyle: 'solid', borderColor: themeColor(theme, 'border') })
  })

  it('paint text with the weight\'s file, never fontWeight', () => {
    expect(themeText(theme, 'body')).toEqual({ fontFamily: 'Poppins-Regular', fontSize: 14, lineHeight: 20 })
    expect(themeText(theme, 'body', { weight: 'bold' }).fontFamily).toBe('Poppins-Bold')
    expect(themeText(theme, 'button')).not.toHaveProperty('fontWeight')
    expect(themeFontFamily(theme, 'body', 300)).toBe('Poppins-Regular')
    expect(themeFontFamily(theme, 'heading', 650)).toBe('Poppins-Bold')
  })

  it('have template twins with units', () => {
    expect(spaceCss(theme, 'md')).toBe('15px')
    expect(textCss(theme, 'body')).toBe('font-family: Poppins-Regular; font-size: 14px; line-height: 20px;')
    expect(shadowCss(theme, 'none', { fixed: true })).toContain('elevation: 0;')
    expect(borderCss(theme, 'thin')).toBe('border-width: 1px; border-style: solid; border-color: #E9ECEF;')
  })

  it('read components, values, visibility and images', () => {
    expect(themePart(theme, 'button', 'sizes.md.height')).toBe(44)
    expect(themeValue(theme, 'tokens.layout.mode')).toBe('original')
    expect(themeVisible(theme, 'orders.business_logo')).toBe(true)
    expect(themeVisible(buildAppTheme(envelope({ visibility: { 'orders.business_logo': false } })), 'orders.business_logo')).toBe(false)
    expect(themeVisible(theme, 'not.a.key')).toBe(true)
    expect(themeImage(theme, 'logotype')).toBe(require('../../assets/images/logotype-invert.png'))
    expect(themeImage(buildAppTheme(envelope({ images: { home_hero: 'https://x/y.jpg' } })), 'home_hero')).toEqual({ uri: 'https://x/y.jpg' })
  })
})

describe('the request and the cache', () => {
  it('asks for version 2 with the product and the schema version of this build', () => {
    expect(buildThemeUrl('https://api.example.com/v400/en/demo/')).toBe(
      `https://api.example.com/v400/en/demo/theme?theme_version=2&product_type=driver_app&theme_schema_version=${THEME_SCHEMA_VERSION}`
    )
  })

  it('reads the envelope as result or result.values, and nothing else', () => {
    const e = envelope({})
    expect(extractTheme({ result: e })).toBe(e)
    expect(extractTheme({ result: { values: e } })).toBe(e)
    expect(extractTheme({ error: true, result: e })).toBeNull()
    expect(extractTheme({ result: { header: {} } })).toBeNull()
  })

  it('never rejects', async () => {
    await expect(fetchTheme({ root: 'x', fetchImpl: (() => Promise.reject(new Error('offline'))) as any })).resolves.toBeNull()
    await expect(fetchTheme({ root: 'x', fetchImpl: (() => Promise.resolve({ ok: false })) as any })).resolves.toBeNull()
    const e = envelope({})
    await expect(fetchTheme({ root: 'x', fetchImpl: (() => Promise.resolve({ ok: true, json: () => Promise.resolve({ result: e }) })) as any })).resolves.toBe(e)
  })

  it('caches per project and schema version, and drops what it cannot read', async () => {
    expect(themeCacheKey('demo')).toBe(`ordering_theme:v2:driver_app:${THEME_SCHEMA_VERSION}:demo`)
    const e = envelope({ tokens: { color: { primary: '#00FF00' } } })
    await writeCachedTheme('demo', e as any)
    await expect(readCachedTheme('demo')).resolves.toEqual(e)
    await expect(readCachedTheme('other')).resolves.toBeNull()
    await AsyncStorage.setItem(themeCacheKey('broken'), '{not json')
    await expect(readCachedTheme('broken')).resolves.toBeNull()
  })
})

describe('fonts', () => {
  const fs = require('fs')
  const path = require('path')
  const schema = require('../../../product.schema.json')
  const catalog: string[] = schema.tokens.font.body.$extensions['co.ordering.editor'].options.map((o: any) => o.value)
  const dirs = ['src/assets/fonts', 'android/app/src/main/assets/fonts'].map(d => path.join(__dirname, '../../..', d))
  const plist = fs.readFileSync(path.join(__dirname, '../../../ios/ODelivery/Info.plist'), 'utf8')

  it.each(catalog)('%s has a bundled file for every weight on both platforms, painted by its file', (font) => {
    // As the API serves it: each typography carries the family of its role.
    const typography = Object.fromEntries(Object.entries(defaultAppTheme().values.tokens.typography).map(([k, v]: any) => [k, { ...v, family: font }]))
    const theme = buildAppTheme(envelope({ tokens: { font: { heading: font, body: font }, typography } }))
    const files = theme.native.fonts.body.files
    expect(Object.keys(files).sort()).toEqual(['400', '500', '600', '700'])
    for (const file of Object.values(files) as string[]) {
      for (const dir of dirs) expect(fs.existsSync(path.join(dir, `${file}.ttf`))).toBe(true)
      expect(plist).toContain(`<string>${file}.ttf</string>`)
    }
    expect(themeText(theme, 'h1').fontFamily).toBe(files['700'])
    expect(themeText(theme, 'body', { weight: 650 }).fontFamily).toBe(files['700'])
  })
})

describe('extreme themes', () => {
  const extremes: Record<string, any> = {
    square: { tokens: { border_style: { radius: 'none' } } },
    pill: { tokens: { border_style: { radius: 'full' } } },
    dark: { tokens: { color: { background: '#0B0B0F', surface: '#16161D', surface_alt: '#22222B', text: '#F5F5F7', text_muted: '#A0A0AB', border: '#2E2E38' } } },
    light_primary: { tokens: { color: { primary: '#FFE66D', on_primary: '#000000' } } },
    dark_primary: { tokens: { color: { primary: '#111111', on_primary: '#FFFFFF' } } },
    no_motion: { tokens: { motion_style: { enabled: false } } },
  }
  it.each(Object.keys(extremes))('%s completes and every helper paints', (name) => {
    const theme = buildAppTheme(envelope(extremes[name]))
    expect(typeof themeRadius(theme, 'md')).toBe('number')
    expect(themeColor(theme, 'surface')).toMatch(/^#|rgba?\(/)
    expect(themePart(theme, 'button', 'variants.primary.solid.color')).toBeTruthy()
    if (name === 'pill') expect(themeRadius(theme, 'md')).toBeGreaterThan(100)
    if (name === 'square') expect(themeRadius(theme, 'md')).toBe(0)
    if (name === 'no_motion') expect(themeMotion(theme, 'base').duration).toBe(0)
  })
})

describe('reduced motion', () => {
  it('turns the theme motion off when the system asks to reduce it', () => {
    const theme: any = defaultAppTheme()
    expect(themeMotion(theme, 'base').duration).toBeGreaterThan(0)
    expect(themeMotion({ ...theme, meta: { ...theme.meta, reduceMotion: true } }, 'base').duration).toBe(0)
  })
})
