import React from 'react'
import { fireEvent } from '@testing-library/react-native'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/d1ShellDefaults')
  const { mainSearchDefaults } = require('../../../../../../jest/helpers/d3OrdersDefaults')
  return {
    ...mockOrdering,
    MainSearch: renderUiController(mainSearchDefaults)
  }
})

const { setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
setupSharedComponentHooks()

import { OrdersOptionCity } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

describe('OrdersOptionCity', () => {
  it('renders city filter placeholder', () => {
    const { getByText } = renderWithProviders(<OrdersOptionCity />)
    expect(getByText('Select City')).toBeTruthy()
  })

  it('calls onSearch when a city is selected', () => {
    const onSearch = jest.fn()
    const { getByText } = renderWithProviders(<OrdersOptionCity onSearch={onSearch} />)
    fireEvent.press(getByText('Select City'))
    fireEvent.press(getByText('City A'))
    expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({ city: 10, cityName: 'City A' }))
  })

  it('shows the chosen city and clears it', () => {
    const onSearch = jest.fn()
    const { mainSearchDefaults } = require('../../../../../../jest/helpers/d3OrdersDefaults')
    const { getByText, getByLabelText, queryByText } = renderWithProviders(
      <OrdersOptionCity search={{ ...mainSearchDefaults.search, city: 10, cityName: 'City A' }} onSearch={onSearch} />
    )
    expect(getByText('City A')).toBeTruthy()
    expect(queryByText('Select City')).toBeNull()
    fireEvent.press(getByLabelText('Clear'))
    expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({ city: '', cityName: '' }))
  })

  it('offers no clear button without a city', () => {
    const { queryByLabelText } = renderWithProviders(<OrdersOptionCity />)
    expect(queryByLabelText('Clear')).toBeNull()
  })

  describe('the select as the boards draw it (sizes round of 2026-11-19)', () => {
    const { StyleSheet } = require('react-native')
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const theme = defaultAppTheme()
    const { components, tokens } = theme.native
    const flat = (node: any) => StyleSheet.flatten(node.props.style)

    it('ends its trigger with a chevron of its own size (18), and the rows of its sheet are 50 high', () => {
      expect(components.input.base.trailing_icon_size).toBe(18)
      expect(components.menu.base.item_height).toBe(tokens.size.lg)
      const view = renderWithProviders(<OrdersOptionCity />)
      const chevrons = view.UNSAFE_getAllByProps({ name: 'chevron-down' })
      expect(chevrons[chevrons.length - 1].props.size).toBe(components.input.base.trailing_icon_size)
      fireEvent.press(view.getByText('Select City'))
      let row: any = view.getByText('City A').parent
      while (row && flat(row)?.minHeight === undefined) row = row.parent
      expect(flat(row).minHeight).toBe(components.menu.base.item_height)
      expect(flat(row).minHeight).toBe(50)
    })

    it('writes the chosen row semibold, and the others regular', () => {
      const { mainSearchDefaults } = require('../../../../../../jest/helpers/d3OrdersDefaults')
      const view = renderWithProviders(
        <OrdersOptionCity search={{ ...mainSearchDefaults.search, city: 10, cityName: 'City A' }} />
      )
      fireEvent.press(view.getByText('City A'))
      const rows = view.getAllByText('City A').map(flat)
      expect(rows.some((style: any) => style.fontFamily === tokens.typography.label.fontFamily)).toBe(true)
      expect(flat(view.getByText('City B')).fontFamily).toBe(tokens.typography.body.fontFamily)
    })
  })
})
