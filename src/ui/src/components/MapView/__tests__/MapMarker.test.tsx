import React from 'react'
import { StyleSheet } from 'react-native'
import { act, render } from '@testing-library/react-native'
import { ThemeProvider } from 'styled-components/native'

// The map library's marker: every prop it is given is on the view, as the library gets it.
jest.mock('react-native-maps', () => {
  const React = require('react')
  const { View } = require('react-native')
  const Marker = (props: any) => React.createElement(View, { testID: 'map-marker', ...props })
  return { __esModule: true, default: View, Marker, PROVIDER_GOOGLE: 'google' }
})

import { MapMarker } from '../MapMarker'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import { nativeShadowStyle } from '../../../../../theme/helpers'
import { BUNDLED_IMAGES, IMAGE_FALLBACKS } from '../../../../../theme/bundledImages'
import SCHEMA from '../../../../../../product.schema.json'

const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const flat = (node: any) => StyleSheet.flatten(node.props.style)
const theme: any = defaultAppTheme()
const marker = theme.native.components.map_marker.base
const at = { latitude: 40.7128, longitude: -74.006 }

const glyphOf = (view: any) => view.UNSAFE_getByProps({ testID: 'map-marker-disc' }).findByType('Icon' as any)

describe('MapMarker', () => {
  it('is a round disc in the marker\'s color, a ring around it, a glyph in it and the marker\'s shadow', () => {
    const view = renderWithProviders(<MapMarker {...at} party='business' />)
    const disc = flat(view.getByTestId('map-marker-disc'))
    expect(disc).toEqual(expect.objectContaining({
      width: marker.size,
      height: marker.size,
      borderRadius: theme.native.tokens.radius.full,
      borderWidth: marker.ring_width,
      borderColor: marker.ring_color,
      backgroundColor: marker.color,
    }))
    expect(disc).toEqual(expect.objectContaining(nativeShadowStyle(marker.shadow)))
    expect(disc.elevation).toBeGreaterThan(0)
    expect(glyphOf(view).props).toEqual(expect.objectContaining({ size: marker.icon_size, color: marker.icon_color }))
  })

  it('is the mockups\' disc by default: 44 across with a white ring, 52 with a thicker one when selected, the driver\'s 36', () => {
    expect([marker.size, marker.ring_width, marker.selected_size, marker.selected_ring_width, marker.me_size])
      .toEqual([44, 3, 52, 4, 36])
    expect(marker.ring_color).toBe(theme.native.tokens.color.surface)
    expect(marker.icon_color).toBe(theme.native.tokens.color.on_primary)
    expect(marker.me_color).toBe(theme.native.tokens.color.text)
  })

  describe('the glyph says who it stands for', () => {
    it.each([
      ['business', 'storefront-outline'],
      ['customer', 'person-outline'],
      ['me', 'navigate-outline'],
    ] as const)('%s: %s', (party, name) => {
      const view = renderWithProviders(<MapMarker {...at} party={party} />)
      expect(glyphOf(view).props.name).toBe(name)
    })

    it('is the same disc for a store and a customer, whatever picture they have: the marker takes no logo or photo', () => {
      const store = renderWithProviders(<MapMarker {...at} party='business' />)
      const customer = renderWithProviders(<MapMarker {...at} party='customer' />)
      expect(flat(store.getByTestId('map-marker-disc'))).toEqual(flat(customer.getByTestId('map-marker-disc')))
      expect(store.UNSAFE_queryAllByType(require('react-native').Image)).toHaveLength(0)
    })
  })

  describe('the selected marker', () => {
    it('is larger, with a thicker ring and a glyph that grows with it, above the others', () => {
      const plain = renderWithProviders(<MapMarker {...at} party='business' />)
      const selected = renderWithProviders(<MapMarker {...at} party='business' selected />)
      const disc = flat(selected.getByTestId('map-marker-disc'))
      expect(disc).toEqual(expect.objectContaining({
        width: marker.selected_size,
        height: marker.selected_size,
        borderWidth: marker.selected_ring_width,
        borderColor: marker.ring_color,
        backgroundColor: marker.color,
      }))
      expect(glyphOf(selected).props.size).toBe(Math.round(marker.icon_size * marker.selected_size / marker.size))
      expect(glyphOf(selected).props.size).toBeGreaterThan(glyphOf(plain).props.size)
      expect(selected.getByTestId('map-marker').props.zIndex).toBeGreaterThan(plain.getByTestId('map-marker').props.zIndex)
    })

    it('is above the stores\' and the customers\' markers, which are above the driver\'s own (a tap over the driver\'s disc is the stop\'s)', () => {
      const zIndex = (props: any) => renderWithProviders(<MapMarker {...at} {...props} />).getByTestId('map-marker').props.zIndex
      expect(zIndex({ party: 'business' })).toBeGreaterThan(zIndex({ party: 'me' }))
      expect(zIndex({ party: 'customer' })).toBeGreaterThan(zIndex({ party: 'me' }))
      expect(zIndex({ party: 'customer', selected: true })).toBeGreaterThan(zIndex({ party: 'business' }))
    })

    it('is a customer\'s as well as a store\'s', () => {
      const view = renderWithProviders(<MapMarker {...at} party='customer' selected />)
      expect(flat(view.getByTestId('map-marker-disc')).width).toBe(marker.selected_size)
    })

    it('does not make the driver\'s own marker a selected one', () => {
      const view = renderWithProviders(<MapMarker {...at} party='me' selected />)
      expect(flat(view.getByTestId('map-marker-disc')).width).toBe(marker.me_size)
    })
  })

  describe('the driver\'s own position is not a button', () => {
    it('takes no tap: no press even when one is given, and not tappable where the platform lets it', () => {
      const onPress = jest.fn()
      const me = renderWithProviders(<MapMarker {...at} party='me' onPress={onPress} />).getByTestId('map-marker')
      expect(me.props.onPress).toBeUndefined()
      expect(me.props.tappable).toBe(false)
    })

    it('is drawn under every stop\'s disc, so where they overlap the tap is the stop\'s', () => {
      const zIndex = (party: any, selected = false) => renderWithProviders(<MapMarker {...at} party={party} selected={selected} />).getByTestId('map-marker').props.zIndex
      expect(zIndex('me')).toBeLessThan(zIndex('business'))
      expect(zIndex('me')).toBeLessThan(zIndex('customer'))
    })
  })

  describe('the driver\'s own position', () => {
    it('is a smaller disc in its own (dark) color with the same ring and glyph color', () => {
      const view = renderWithProviders(<MapMarker {...at} party='me' />)
      expect(flat(view.getByTestId('map-marker-disc'))).toEqual(expect.objectContaining({
        width: marker.me_size,
        height: marker.me_size,
        backgroundColor: marker.me_color,
        borderWidth: marker.ring_width,
        borderColor: marker.ring_color,
      }))
      expect(glyphOf(view).props.size).toBe(Math.round(marker.icon_size * marker.me_size / marker.size))
      expect(glyphOf(view).props.color).toBe(marker.icon_color)
    })
  })

  describe('the anchor', () => {
    it('is the disc\'s center, selected or not, so the disc sits on its coordinate and a selected one grows around it', () => {
      const plain = renderWithProviders(<MapMarker {...at} party='business' />).getByTestId('map-marker')
      const selected = renderWithProviders(<MapMarker {...at} party='business' selected />).getByTestId('map-marker')
      expect(plain.props.anchor).toEqual({ x: 0.5, y: 0.5 })
      expect(selected.props.anchor).toEqual({ x: 0.5, y: 0.5 })
      expect(plain.props.coordinate).toEqual(at)
    })

    it('is the center of the view the library photographs: the disc is centered in a square room for its shadow', () => {
      const view = renderWithProviders(<MapMarker {...at} party='business' selected />)
      const stage = flat(view.getByTestId('map-marker').children[0])
      const bleed = Math.ceil(marker.shadow.shadowRadius + Math.abs(marker.shadow.shadowOffset.height))
      expect(stage).toEqual(expect.objectContaining({
        width: marker.selected_size + 2 * bleed,
        height: marker.selected_size + 2 * bleed,
        alignItems: 'center',
        justifyContent: 'center',
      }))
    })
  })

  describe('the theme', () => {
    it('gives every value of the disc: color, sizes, rings, glyph and the driver\'s disc', () => {
      const custom: any = themeWith({
        components: {
          map_marker: {
            base: {
              color: '#112233',
              size: 40,
              selected_size: 60,
              icon_size: 20,
              icon_color: '#ABCDEF',
              ring_color: '#FEDCBA',
              ring_width: 2,
              selected_ring_width: 6,
              me_size: 30,
              me_color: '#445566',
            },
          },
        },
      })
      const options = { themeOverrides: custom }
      const plain = renderWithProviders(<MapMarker {...at} party='business' />, options)
      expect(flat(plain.getByTestId('map-marker-disc'))).toEqual(expect.objectContaining({
        width: 40, height: 40, backgroundColor: '#112233', borderColor: '#FEDCBA', borderWidth: 2,
      }))
      expect(glyphOf(plain).props).toEqual(expect.objectContaining({ size: 20, color: '#ABCDEF' }))
      const selected = renderWithProviders(<MapMarker {...at} party='customer' selected />, options)
      expect(flat(selected.getByTestId('map-marker-disc'))).toEqual(expect.objectContaining({ width: 60, height: 60, borderWidth: 6 }))
      expect(glyphOf(selected).props.size).toBe(30)
      const me = renderWithProviders(<MapMarker {...at} party='me' />, options)
      expect(flat(me.getByTestId('map-marker-disc'))).toEqual(expect.objectContaining({ width: 30, height: 30, backgroundColor: '#445566' }))
    })

    it('keeps its shadow when the theme is flat (what floats over a map)', () => {
      const flatTheme: any = themeWith({ tokens: { shadow_style: { size: 'none' } } })
      const view = renderWithProviders(<MapMarker {...at} party='business' />, { themeOverrides: flatTheme })
      expect(flat(view.getByTestId('map-marker-disc')).elevation).toBeGreaterThan(0)
    })
  })

  describe('what the screen gives', () => {
    it('is pressed as the screen says, and has no label unless the screen gives one', () => {
      const onPress = jest.fn()
      const view = renderWithProviders(<MapMarker {...at} party='business' onPress={onPress} />)
      const mapMarker = view.getByTestId('map-marker')
      act(() => { mapMarker.props.onPress() })
      expect(onPress).toHaveBeenCalledTimes(1)
      expect(mapMarker.props.accessibilityLabel).toBeUndefined()
      expect(mapMarker.props.tappable).toBe(true)
    })

    it('never has a title: the library draws a square, unthemed info window for any marker that has one (the app\'s cards say what a stop is)', () => {
      for (const party of ['business', 'customer', 'me'] as const) {
        const view = renderWithProviders(<MapMarker {...at} party={party} selected label='Anything' {...({ title: 'Luna Pizza' } as any)} />)
        expect(view.getByTestId('map-marker').props.title).toBeUndefined()
        expect(view.getByTestId('map-marker').props.description).toBeUndefined()
      }
    })

    it('says what a screen reader reads of the disc with the marker\'s accessibility label, not with a title', () => {
      const view = renderWithProviders(<MapMarker {...at} party='me' label='Your Location' />)
      expect(view.getByTestId('map-marker').props.accessibilityLabel).toBe('Your Location')
      expect(view.getByTestId('map-marker').props.title).toBeUndefined()
    })
  })

  describe('the view the map library photographs (Android draws a custom marker to a bitmap)', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())
    const tracks = (view: any) => view.getByTestId('map-marker').props.tracksViewChanges

    it('is tracked while it is first painted and left alone after, so the map moving does not photograph it again', () => {
      const view = renderWithProviders(<MapMarker {...at} party='business' />)
      expect(tracks(view)).toBe(true)
      act(() => { jest.runOnlyPendingTimers() })
      expect(tracks(view)).toBe(false)
      // A parent that renders again (the map's region, the card) with the same marker does not start it again.
      view.rerender(<MapMarker {...at} party='business' />)
      act(() => { jest.runOnlyPendingTimers() })
      expect(tracks(view)).toBe(false)
    })

    it('is tracked again when it is selected or not, in the same render that changes it, and then left alone', () => {
      const view = renderWithProviders(<MapMarker {...at} party='business' />)
      act(() => { jest.runOnlyPendingTimers() })
      expect(tracks(view)).toBe(false)
      view.rerender(<MapMarker {...at} party='business' selected />)
      expect(tracks(view)).toBe(true)
      expect(flat(view.getByTestId('map-marker-disc')).width).toBe(marker.selected_size)
      act(() => { jest.runOnlyPendingTimers() })
      expect(tracks(view)).toBe(false)
      view.rerender(<MapMarker {...at} party='business' />)
      expect(tracks(view)).toBe(true)
      act(() => { jest.runOnlyPendingTimers() })
      expect(tracks(view)).toBe(false)
    })

    it('is tracked again when the theme changes what it paints', () => {
      const custom: any = themeWith({ components: { map_marker: { base: { color: '#112233' } } } })
      const inTheme = (value: any) => (
        <ThemeProvider theme={value}><MapMarker {...at} party='business' /></ThemeProvider>
      )
      const view = render(inTheme(theme))
      act(() => { jest.runOnlyPendingTimers() })
      expect(tracks(view)).toBe(false)
      view.rerender(inTheme(custom))
      expect(tracks(view)).toBe(true)
      expect(flat(view.getByTestId('map-marker-disc')).backgroundColor).toBe('#112233')
    })
  })

  describe('draws no picture', () => {
    it('has no image of the theme: the old pin\'s `images.map.driver` is not in the schema, the theme\'s images, the bundled images or the fallbacks', () => {
      expect(Object.keys((SCHEMA as any).images)).not.toContain('map.driver')
      expect(Object.keys(theme.values.images)).not.toContain('map.driver')
      expect(Object.keys(IMAGE_FALLBACKS)).not.toContain('map.driver')
      expect(Object.keys(BUNDLED_IMAGES.general)).not.toContain('driverImage')
      // The editor's image cards list only images that exist.
      const schema = JSON.stringify(SCHEMA)
      expect(schema).not.toContain('images.map.driver')
      expect(schema).not.toContain('maps_tracking')
    })

    it('paints the disc and its glyph, and no image', () => {
      const view = renderWithProviders(<MapMarker {...at} party='customer' />)
      expect(view.UNSAFE_queryAllByType(require('react-native').Image)).toHaveLength(0)
    })
  })
})
