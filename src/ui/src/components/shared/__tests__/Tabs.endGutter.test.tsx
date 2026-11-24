import React from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { act } from '@testing-library/react-native'

import { Tabs } from '../Tabs'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { defaultAppTheme } from '../../../../../theme/engine'

const tabs = [{ key: 'a', text: 'A' }, { key: 'b', text: 'B' }, { key: 'c', text: 'C' }, { key: 'd', text: 'D' }]
const gutter = (defaultAppTheme() as any).native.tokens.layout.page_gutter

describe('Tabs endGutter', () => {
  it('leaves the content of a scrolling row as it was by default', () => {
    const { UNSAFE_getByType } = renderWithProviders(<Tabs tabs={tabs} selected='a' onChange={jest.fn()} />)
    expect(StyleSheet.flatten(UNSAFE_getByType(ScrollView).props.contentContainerStyle).paddingEnd).toBeUndefined()
  })

  it('ends the content of a scrolling row with the page gutter, so its last tab clears the screen\'s edge', () => {
    const { UNSAFE_getByType } = renderWithProviders(<Tabs tabs={tabs} selected='a' onChange={jest.fn()} endGutter />)
    expect(StyleSheet.flatten(UNSAFE_getByType(ScrollView).props.contentContainerStyle).paddingEnd).toBe(gutter)
  })

  it('does nothing to tabs that share the row', () => {
    const { UNSAFE_queryAllByType } = renderWithProviders(<Tabs tabs={tabs} selected='a' onChange={jest.fn()} fill endGutter />)
    expect(UNSAFE_queryAllByType(ScrollView)).toHaveLength(0)
  })

  describe('fitFill: share the row when the tabs fit, scroll when they do not', () => {
    const withIds = tabs.map((tab) => ({ ...tab, testID: `tab-${tab.key}` }))
    /** The row has `room` and its tabs take `track` together. */
    const measure = (screen: any, room: number, track: number) => {
      act(() => screen.UNSAFE_getByType(ScrollView).props.onLayout({ nativeEvent: { layout: { width: room + gutter, height: 44 } } }))
      act(() => screen.getByTestId('strip-track').props.onLayout({ nativeEvent: { layout: { width: track, height: 44 } } }))
    }

    it('scrolls (out to the edge) until it is measured, and keeps scrolling when the tabs take more than the row', () => {
      const screen = renderWithProviders(<Tabs tabs={withIds} selected='a' onChange={jest.fn()} fitFill endGutter testID='strip' />)
      expect(StyleSheet.flatten(screen.UNSAFE_getByType(ScrollView).props.style).marginEnd).toBe(-gutter)
      measure(screen, 360, 420)
      expect(screen.UNSAFE_queryAllByType(ScrollView)).toHaveLength(1)
    })

    it('spreads the tabs over the full row when they fit it: each keeps its width and grows into the rest', () => {
      const screen = renderWithProviders(<Tabs tabs={withIds} selected='a' onChange={jest.fn()} fitFill endGutter testID='strip' />)
      measure(screen, 360, 333)
      expect(screen.UNSAFE_queryAllByType(ScrollView)).toHaveLength(0)
      expect(StyleSheet.flatten(screen.getByTestId('strip').props.style).width).toBe('100%')
      const tab = StyleSheet.flatten(screen.getByTestId('tab-a').props.style)
      expect(tab.flexGrow).toBe(1)
      expect(tab.flex).toBeUndefined()
    })

    it('scrolls again when the room it was shared in gets narrower (a rotation, a split screen), and shares again if they still fit', () => {
      const screen = renderWithProviders(<Tabs tabs={withIds} selected='a' onChange={jest.fn()} fitFill endGutter testID='strip' />)
      measure(screen, 360, 333)
      expect(screen.UNSAFE_queryAllByType(ScrollView)).toHaveLength(0)
      // The shared row is laid out at its room, then the room shrinks under the tabs.
      act(() => screen.getByTestId('strip').props.onLayout({ nativeEvent: { layout: { width: 360, height: 44 } } }))
      act(() => screen.getByTestId('strip').props.onLayout({ nativeEvent: { layout: { width: 300, height: 44 } } }))
      expect(screen.UNSAFE_queryAllByType(ScrollView)).toHaveLength(1)
      measure(screen, 300, 333)
      expect(screen.UNSAFE_queryAllByType(ScrollView)).toHaveLength(1)
      // The room grows past what the tabs take: the measured width is still theirs, so they share the row.
      act(() => screen.UNSAFE_getByType(ScrollView).props.onLayout({ nativeEvent: { layout: { width: 400 + gutter, height: 44 } } }))
      expect(screen.UNSAFE_queryAllByType(ScrollView)).toHaveLength(0)
    })

    it('is not shaken by layouts of the same width', () => {
      const screen = renderWithProviders(<Tabs tabs={withIds} selected='a' onChange={jest.fn()} fitFill endGutter testID='strip' />)
      measure(screen, 360, 333)
      act(() => screen.getByTestId('strip').props.onLayout({ nativeEvent: { layout: { width: 360, height: 44 } } }))
      act(() => screen.getByTestId('strip').props.onLayout({ nativeEvent: { layout: { width: 360.4, height: 44 } } }))
      expect(screen.UNSAFE_queryAllByType(ScrollView)).toHaveLength(0)
    })

    it('measures again when the font grows (the tabs that fitted may not any more), and when the window changes', () => {
      const dimensions = jest.spyOn(require('react-native'), 'useWindowDimensions')
      dimensions.mockReturnValue({ width: 390, height: 844, scale: 3, fontScale: 1 })
      const screen = renderWithProviders(<Tabs tabs={withIds} selected='a' onChange={jest.fn()} fitFill endGutter testID='strip' />)
      measure(screen, 360, 333)
      expect(screen.UNSAFE_queryAllByType(ScrollView)).toHaveLength(0)
      dimensions.mockReturnValue({ width: 390, height: 844, scale: 3, fontScale: 1.5 })
      screen.rerender(<Tabs tabs={withIds} selected='a' onChange={jest.fn()} fitFill endGutter testID='strip' />)
      expect(screen.UNSAFE_queryAllByType(ScrollView)).toHaveLength(1)
      // Measured at the larger font: they no longer fit.
      measure(screen, 360, 420)
      expect(screen.UNSAFE_queryAllByType(ScrollView)).toHaveLength(1)
      dimensions.mockReturnValue({ width: 820, height: 1180, scale: 2, fontScale: 1.5 })
      screen.rerender(<Tabs tabs={withIds} selected='a' onChange={jest.fn()} fitFill endGutter testID='strip' />)
      measure(screen, 790, 420)
      expect(screen.UNSAFE_queryAllByType(ScrollView)).toHaveLength(0)
      dimensions.mockRestore()
    })

    it('does nothing without the prop: the Orders strip keeps scrolling', () => {
      const screen = renderWithProviders(<Tabs tabs={withIds} selected='a' onChange={jest.fn()} endGutter />)
      expect(StyleSheet.flatten(screen.UNSAFE_getByType(ScrollView).props.style).marginEnd).toBeUndefined()
      expect(screen.UNSAFE_getByType(ScrollView).props.onLayout).toBeUndefined()
    })
  })
})
