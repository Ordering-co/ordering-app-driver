import React from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { act, within } from '@testing-library/react-native'

import { Tabs } from '../Tabs'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { defaultAppTheme } from '../../../../../theme/engine'

const gutter = (defaultAppTheme() as any).native.tokens.layout.page_gutter
const tabs = [
  { key: 'a', text: 'Assigned', testID: 'tab-a' },
  { key: 'b', text: 'In Progress', testID: 'tab-b' },
  { key: 'c', text: 'History', testID: 'tab-c' }
]

/** The row has `room` and its tabs take `track` together. */
const measure = (screen: any, room: number, track: number) => {
  act(() => screen.UNSAFE_getByType(ScrollView).props.onLayout({ nativeEvent: { layout: { width: room + gutter, height: 44 } } }))
  act(() => screen.getByTestId('strip-track').props.onLayout({ nativeEvent: { layout: { width: track, height: 44 } } }))
}

describe('Tabs noWrap (a label is one line, the tab takes the width it asks for)', () => {
  it('writes every label on one line, the room kept at the selected weight and the shown copy too', () => {
    const screen = renderWithProviders(<Tabs tabs={tabs} selected='b' onChange={jest.fn()} fitFill endGutter noWrap testID='strip' />)
    for (const tab of tabs) {
      const labels = within(screen.getByTestId(tab.testID)).getAllByText(tab.text, { includeHiddenElements: true })
      // The hidden copy that keeps the semibold width and the one that is drawn.
      expect(labels).toHaveLength(2)
      labels.forEach((label: any) => expect(label.props.numberOfLines).toBe(1))
    }
  })

  it('leaves the labels of the other users as they were (no limit of lines unless it is asked for)', () => {
    const screen = renderWithProviders(<Tabs tabs={tabs} selected='a' onChange={jest.fn()} fill />)
    within(screen.getByTestId('tab-a')).getAllByText('Assigned', { includeHiddenElements: true }).forEach((label: any) => expect(label.props.numberOfLines).toBeUndefined())
  })

  it('shares what is left of the row equally: each tab keeps its own width and grows by the same amount', () => {
    const screen = renderWithProviders(<Tabs tabs={tabs} selected='a' onChange={jest.fn()} fitFill endGutter noWrap testID='strip' />)
    measure(screen, 360, 300)
    expect(screen.UNSAFE_queryAllByType(ScrollView)).toHaveLength(0)
    for (const key of ['a', 'b', 'c']) {
      const style = StyleSheet.flatten(screen.getByTestId(`tab-${key}`).props.style)
      expect(style.flexGrow).toBe(1)
      expect(style.flexBasis).toBeUndefined()
      expect(style.flex).toBeUndefined()
    }
  })

  it('scrolls sideways, out to the screen\'s edge, when the labels do not fit (a long language, a narrow phone, a large font)', () => {
    const screen = renderWithProviders(<Tabs tabs={tabs} selected='a' onChange={jest.fn()} fitFill endGutter noWrap testID='strip' />)
    measure(screen, 320, 380)
    const strip = screen.UNSAFE_getByType(ScrollView)
    expect(strip.props.horizontal).toBe(true)
    expect(StyleSheet.flatten(strip.props.style).marginEnd).toBe(-gutter)
  })

  describe('after the system\'s text size changes while the app runs', () => {
    const windowAt = (fontScale: number) => jest.spyOn(require('react-native'), 'useWindowDimensions').mockReturnValue({ width: 402, height: 874, scale: 3, fontScale })
    afterEach(() => jest.restoreAllMocks())

    it('measures again in a new row, since a row that keeps its layout is sent no layout again (the tabs stayed narrow until a relaunch)', () => {
      windowAt(1)
      const screen = renderWithProviders(<Tabs tabs={tabs} selected='a' onChange={jest.fn()} fitFill endGutter noWrap testID='strip' />)
      measure(screen, 360, 380)
      const first: any = screen.UNSAFE_getByType(ScrollView)
      // The text size changes; the layout under the row does not (the system caps the text), so React Native would send nothing to a row it kept.
      windowAt(1.5)
      screen.rerender(<Tabs tabs={tabs} selected='a' onChange={jest.fn()} fitFill endGutter noWrap testID='strip' />)
      const second: any = screen.UNSAFE_getByType(ScrollView)
      expect(second._fiber.key).not.toBe(first._fiber.key)
      expect(second._fiber.key).toContain('1.5')
    })

    it('shares the row again when the text size goes back and the tabs fit (the Orders tabs filled their row only after a relaunch)', () => {
      windowAt(1)
      const screen = renderWithProviders(<Tabs tabs={tabs} selected='a' onChange={jest.fn()} fitFill endGutter noWrap testID='strip' />)
      measure(screen, 360, 300)
      expect(screen.UNSAFE_queryAllByType(ScrollView)).toHaveLength(0)
      // Larger: they no longer fit and scroll.
      windowAt(1.5)
      screen.rerender(<Tabs tabs={tabs} selected='a' onChange={jest.fn()} fitFill endGutter noWrap testID='strip' />)
      measure(screen, 360, 420)
      expect(screen.UNSAFE_getByType(ScrollView)).toBeTruthy()
      // Back to the default: a new row reports its layout again and the tabs fit.
      windowAt(1)
      screen.rerender(<Tabs tabs={tabs} selected='a' onChange={jest.fn()} fitFill endGutter noWrap testID='strip' />)
      measure(screen, 360, 300)
      expect(screen.UNSAFE_queryAllByType(ScrollView)).toHaveLength(0)
      expect(StyleSheet.flatten(screen.getByTestId('tab-a').props.style).flexGrow).toBe(1)
    })
  })
})
