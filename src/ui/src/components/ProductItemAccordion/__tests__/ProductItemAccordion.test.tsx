import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { useUtils } from '@components'

jest.mock('@ui', () => ({
  DeviceOrientationMethods: {
    useDeviceOrientation: jest.fn(() => [{
      orientation: 'portrait',
      dimensions: { width: 390, height: 844 }
    }])
  }
}))

jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))

import { ProductItemAccordion } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

const mockParsePrice = jest.fn((value: number) => `SRD ${value}`)

describe('ProductItemAccordion', () => {
  beforeEach(() => {
    mockParsePrice.mockClear()
    ;(useUtils as jest.Mock).mockReturnValue([{
      parsePrice: mockParsePrice
    }])
  })

  it('uses the configured price formatter without overriding its currency', () => {
    const { getByText } = renderWithProviders(
      <ProductItemAccordion
        product={{
          id: 1,
          name: 'Burger',
          quantity: 1,
          price: 10,
          options: '[]',
          ingredients: []
        }}
        currency="USD"
      />
    )
    expect(getByText(/Burger/)).toBeTruthy()
    expect(mockParsePrice).toHaveBeenCalledWith(10)
  })

  it('toggles accordion when clickable', () => {
    const { getByText } = renderWithProviders(
      <ProductItemAccordion
        isClickableEvent
        product={{
          id: 1,
          name: 'Burger',
          quantity: 2,
          price: 10,
          options: '[]',
          ingredients: [],
          comment: 'Extra sauce'
        }}
        currency="USD"
      />
    )
    fireEvent.press(getByText(/Burger/))
    expect(getByText('Extra sauce')).toBeTruthy()
  })

  it('renders options when product has nested options', () => {
    const { getByText } = renderWithProviders(
      <ProductItemAccordion
        product={{
          id: 1,
          name: 'Pizza',
          quantity: 1,
          price: 12,
          options: JSON.stringify([
            {
              name: 'Toppings',
              suboptions: [{ quantity: 1, name: 'Cheese', position: 'whole', price: 2 }]
            }
          ]),
          ingredients: []
        }}
        currency="USD"
      />
    )
    expect(getByText(/Pizza/)).toBeTruthy()
    expect(getByText(/Cheese/)).toBeTruthy()
  })

  it('renders removed ingredients in accordion details', () => {
    const { getByText } = renderWithProviders(
      <ProductItemAccordion
        isClickableEvent
        product={{
          id: 1,
          name: 'Salad',
          quantity: 1,
          price: 8,
          options: '[]',
          ingredients: [{ name: 'Onion', selected: false }]
        }}
        currency="USD"
      />
    )
    fireEvent.press(getByText(/Salad/))
    expect(getByText(/No Onion/)).toBeTruthy()
  })

  it('renders suboption position labels', () => {
    const { getByText } = renderWithProviders(
      <ProductItemAccordion
        product={{
          id: 1,
          name: 'Pizza',
          quantity: 1,
          price: 12,
          options: JSON.stringify([
            {
              name: 'Toppings',
              suboptions: [{ quantity: 1, name: 'Pepperoni', position: 'left', price: 2 }]
            }
          ]),
          ingredients: []
        }}
        currency="USD"
      />
    )
    expect(getByText(/left/)).toBeTruthy()
  })

  it('does not crash when options is malformed JSON', () => {
    const { getByText } = renderWithProviders(
      <ProductItemAccordion
        product={{
          id: 1,
          name: 'Burger',
          quantity: 1,
          price: 10,
          options: '[{"name":',
          ingredients: []
        }}
        currency="USD"
      />
    )
    expect(getByText(/Burger/)).toBeTruthy()
  })

  it('does not crash when an option has no suboptions', () => {
    const { getByText } = renderWithProviders(
      <ProductItemAccordion
        product={{
          id: 1,
          name: 'Pizza',
          quantity: 1,
          price: 12,
          options: JSON.stringify([{ name: 'Toppings' }]),
          ingredients: []
        }}
        currency="USD"
      />
    )
    expect(getByText(/Pizza/)).toBeTruthy()
    expect(getByText(/Toppings/)).toBeTruthy()
  })
})
