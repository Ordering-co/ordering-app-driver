import React from 'react'
import { StyleSheet } from 'react-native'
import { act } from '@testing-library/react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { defaultAppTheme } from '../../../../../theme/engine'

// The inset the system keeps under the screen: the home indicator.
const mockInsets = { top: 0, right: 0, bottom: 34, left: 0 }
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: any) => children,
  useSafeAreaInsets: () => mockInsets,
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 })
}))
jest.mock('../../OrdersOptionCity', () => ({ OrdersOptionCity: () => null }))
jest.mock('../../OrdersOptionDate', () => ({ OrdersOptionDate: () => null }))

import { OrdersSearchForm } from '../OrdersSearchForm'

describe('OrdersSearchForm', () => {
  const bar = defaultAppTheme().native.components.bottom_bar.base

  const renderForm = () => renderWithProviders(
    <OrdersSearchForm
      search={{ id: '', external_id: '' }}
      onSearch={jest.fn()}
      onApply={jest.fn()}
      onClear={jest.fn()}
      showSla={false}
      cityProps={{}}
    />
  )
  /** The padding under the two actions: the view around them that carries the bar's look. */
  const barBottom = (view: ReturnType<typeof renderForm>) => {
    let node: any = view.getByText('Search').parent
    while (node && StyleSheet.flatten(node.props.style)?.paddingBottom === undefined) node = node.parent
    return StyleSheet.flatten(node.props.style).paddingBottom
  }

  it('keeps only the bar\'s own padding under the actions while the keyboard is up, the inset again once it is down', () => {
    const { Keyboard } = require('react-native')
    const listeners: Record<string, Array<() => void>> = {}
    const add = jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, cb: () => void) => {
      (listeners[event] = listeners[event] || []).push(cb)
      return { remove: jest.fn() }
    }) as any)
    const emit = (event: string) => act(() => { (listeners[event] || []).forEach((cb) => cb()) })
    const view = renderForm()
    expect(barBottom(view)).toBe(bar.padding + 34)
    emit('keyboardWillShow')
    emit('keyboardDidShow')
    expect(barBottom(view)).toBe(bar.padding)
    emit('keyboardWillHide')
    emit('keyboardDidHide')
    expect(barBottom(view)).toBe(bar.padding + 34)
    add.mockRestore()
  })
})
