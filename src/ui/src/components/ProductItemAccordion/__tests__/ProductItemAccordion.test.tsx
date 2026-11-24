import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { StyleSheet } from 'react-native'
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
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'

/** A theme built from values, as the app builds it (never a spread). */
const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const flat = (node: any) => StyleSheet.flatten(node.props.style)

const pizza = {
  id: 1,
  name: 'Pizza',
  quantity: 1,
  price: 12,
  comment: 'Well done',
  options: JSON.stringify([
    {
      id: 5,
      name: 'Toppings',
      suboptions: [{ id: 6, quantity: 1, name: 'Cheese', position: 'whole', price: 2 }]
    }
  ]),
  ingredients: [{ id: 7, name: 'Onion', selected: false }]
}

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

  it('writes the name in the text color and lets it take the room the price leaves', () => {
    const { getByText } = renderWithProviders(<ProductItemAccordion product={pizza} currency="USD" />)
    const name = flat(getByText(/Pizza/))
    expect(name.color).toBe(defaultAppTheme().native.tokens.color.text)
    expect(name.flex).toBe(1)
    expect(name.width).toBeUndefined()
  })

  it('writes every group of the details and its lines in one style: small, muted (as the boards draw them)', () => {
    const theme = defaultAppTheme()
    const small = theme.native.tokens.typography.body_sm
    const { getByText } = renderWithProviders(<ProductItemAccordion product={pizza} />)
    const texts = [getByText(/^Ingredients/), getByText('Toppings'), getByText('Comment'), getByText('Well done')].map(flat)
    texts.forEach((style) => {
      expect(style.fontSize).toBe(small.fontSize)
      expect(style.fontFamily).toBe(small.fontFamily)
      expect(style.color).toBe(theme.native.tokens.color.text_muted)
    })
  })

  it('draws the quantity in a small box before the name (`order_details.base.quantity_size`)', () => {
    const theme = defaultAppTheme()
    const size = theme.native.components.order_details.base.quantity_size
    const { getByText } = renderWithProviders(<ProductItemAccordion product={pizza} />)
    let holder: any = getByText(String(pizza.quantity)).parent
    while (holder && flat(holder)?.width === undefined) holder = holder.parent
    const box = flat(holder)
    expect(size).toBe(28)
    expect(box).toEqual(expect.objectContaining({
      width: size,
      height: size,
      borderRadius: theme.native.tokens.radius.sm,
      backgroundColor: theme.native.tokens.color.surface_alt
    }))
  })

  it('opens and closes from its row, with the one accordion glyph', () => {
    const { getByRole, getByText, queryByText, UNSAFE_getByProps, UNSAFE_queryByProps } = renderWithProviders(
      <ProductItemAccordion product={pizza} currency="USD" />
    )
    // A product with something to show starts open.
    expect(getByText(/Cheese/)).toBeTruthy()
    expect(UNSAFE_getByProps({ name: 'chevron-up' })).toBeTruthy()
    const row = getByRole('button')
    expect(row.props.accessibilityState.expanded).toBe(true)
    // The row is as tall as its quantity box, and a touch target of at least 44 through its slop.
    const slop = row.props.hitSlop
    expect(flat(row)?.minHeight).toBeUndefined()
    expect(defaultAppTheme().native.components.order_details.base.quantity_size + slop.top + slop.bottom).toBeGreaterThanOrEqual(44)
    fireEvent.press(row)
    expect(queryByText(/Cheese/)).toBeNull()
    expect(queryByText('Well done')).toBeNull()
    expect(UNSAFE_getByProps({ name: 'chevron-down' })).toBeTruthy()
    expect(UNSAFE_queryByProps({ name: 'chevron-up' })).toBeNull()
  })

  it('puts the price last in every line, so it ends at the same edge whether the line opens or not (the glyph is before it, a line with nothing to open leaves no room for one)', () => {
    const opens = renderWithProviders(<ProductItemAccordion product={pizza} currency="USD" />)
    const plain = renderWithProviders(
      <ProductItemAccordion product={{ id: 2, name: 'Water', quantity: 1, price: 1, options: [], ingredients: [], comment: '' }} currency="USD" />
    )
    const lastOf = (screen: any, price: string) => {
      const text: any = screen.getByText(price)
      const row = text.parent
      return row.children[row.children.length - 1]
    }
    expect(lastOf(opens, 'SRD 12').props.children).toBe('SRD 12')
    expect(lastOf(plain, 'SRD 1').props.children).toBe('SRD 1')
    // Nothing is drawn after the price.
    expect(plain.queryByTestId('product-line-spacer')).toBeNull()
  })

  it('is not a button when it has nothing to open', () => {
    const { queryByRole, UNSAFE_queryByProps } = renderWithProviders(
      <ProductItemAccordion
        product={{ id: 1, name: 'Water', quantity: 1, price: 1, options: [], ingredients: [], comment: '' }}
        currency="USD"
      />
    )
    expect(queryByRole('button')).toBeNull()
    expect(UNSAFE_queryByProps({ name: 'chevron-down' })).toBeNull()
    expect(UNSAFE_queryByProps({ name: 'chevron-up' })).toBeNull()
  })

  it('confirmation.products.options hides the options and the ingredients, and keeps the comment', () => {
    const shown = renderWithProviders(<ProductItemAccordion product={pizza} currency="USD" />)
    expect(shown.getByText('Toppings')).toBeTruthy()
    expect(shown.getByText(/Cheese/)).toBeTruthy()
    expect(shown.getByText(/No Onion/)).toBeTruthy()
    expect(shown.getByText('Well done')).toBeTruthy()

    const hidden = renderWithProviders(
      <ProductItemAccordion product={pizza} currency="USD" />,
      { themeOverrides: themeWith({ visibility: { 'confirmation.products.options': false } }) }
    )
    expect(hidden.queryByText('Toppings')).toBeNull()
    expect(hidden.queryByText(/Cheese/)).toBeNull()
    expect(hidden.queryByText(/No Onion/)).toBeNull()
    expect(hidden.getByText(/Pizza/)).toBeTruthy()
    expect(hidden.getByText('Well done')).toBeTruthy()
  })

  it('opens a long comment with the theme\'s link, which is as wide as its text', () => {
    const link = defaultAppTheme().native.components.link
    const { getByText, getByRole, queryByRole } = renderWithProviders(<ProductItemAccordion product={pizza} currency="USD" />)
    expect(queryByRole('link')).toBeNull()
    fireEvent(getByText('Well done'), 'textLayout', { nativeEvent: { lines: [{}, {}, {}] } })
    const more = getByRole('link', { name: 'Read more' })
    expect(flat(more).alignSelf).toBe('flex-start')
    expect(flat(getByText('Read more')).color).toBe(link.base.color)
    expect(flat(getByText('Read more')).fontSize).toBe(link.sizes.md.text.fontSize)
    fireEvent.press(more)
    expect(getByRole('link', { name: 'Show less' })).toBeTruthy()
    expect(getByText('Well done').props.numberOfLines).toBe(15)
  })

  it('with the options hidden, a product without a comment has nothing to open', () => {
    const { queryByRole } = renderWithProviders(
      <ProductItemAccordion product={{ ...pizza, comment: '' }} currency="USD" />,
      { themeOverrides: themeWith({ visibility: { 'confirmation.products.options': false } }) }
    )
    expect(queryByRole('button')).toBeNull()
  })
})
