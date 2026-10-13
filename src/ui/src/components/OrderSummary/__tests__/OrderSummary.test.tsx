import React from 'react'
import { Alert } from 'react-native'
import { fireEvent } from '@testing-library/react-native'

import { useConfig, useUtils } from '@components'
import RNPrint from 'react-native-print'

jest.mock('react-native-html-to-pdf', () => ({
  convert: jest.fn().mockResolvedValue({ filePath: '/tmp/order.pdf' })
}))

jest.mock('react-native-print', () => ({
  print: jest.fn().mockResolvedValue(undefined),
  selectPrinter: jest.fn().mockResolvedValue({ url: 'printer://test' })
}))

jest.mock('@ui', () => {
  const React = require('react')
  const path = require('path')
  const { Pressable, Text } = require('react-native')
  const root = path.join(__dirname, '../../../../../../')
  const req = (relativePath) => require(path.join(root, relativePath))
  const { buildD3OrdersUiMock } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  const mock = buildD3OrdersUiMock()

  return {
    ...mock,
    ProductItemAccordion: req('src/ui/src/components/ProductItemAccordion').ProductItemAccordion,
    FloatingButton: ({ firstButtonClick, btnText }: any) =>
      React.createElement(
        Pressable,
        { testID: 'floating-print', onPress: firstButtonClick },
        React.createElement(Text, null, btnText)
      )
  }
})

jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))

import { OrderSummary } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { richSampleOrder, sampleOrder } from '../../../../../../jest/helpers/d3OrdersDefaults'

describe('OrderSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())
    ;(useConfig as jest.Mock).mockReturnValue([{
      configs: {
        driver_tip_type: { value: '2' },
        driver_tip_use_custom: { value: '0' }
      }
    }])
    ;(useUtils as jest.Mock).mockReturnValue([{
      parsePrice: (value: number) => `$${value}`,
      parseNumber: (value: number) => value,
      parseDate: (value: string) => value || '2026-01-01'
    }])
  })

  it('renders order total and business name', () => {
    const { getByText } = renderWithProviders(
      <OrderSummary order={sampleOrder} orderStatus="Pending" />
    )
    expect(getByText('Store A')).toBeTruthy()
    expect(getByText('Total')).toBeTruthy()
  })

  it('renders rich order billing sections', () => {
    const { getByText } = renderWithProviders(
      <OrderSummary order={richSampleOrder} orderStatus="Pending" />
    )
    expect(getByText('Customer details')).toBeTruthy()
    expect(getByText('Business details')).toBeTruthy()
    expect(getByText('Order Details')).toBeTruthy()
    expect(getByText('Subtotal')).toBeTruthy()
    expect(getByText('Delivery Fee')).toBeTruthy()
    expect(getByText('Payments')).toBeTruthy()
    expect(getByText(/Order Comment/)).toBeTruthy()
  })

  it('navigates back when header arrow is pressed', () => {
    const goBack = jest.fn()
    const canGoBack = jest.fn(() => true)
    const { UNSAFE_getAllByType } = renderWithProviders(
      <OrderSummary
        order={sampleOrder}
        orderStatus="Pending"
        navigation={{ goBack, canGoBack }}
      />
    )
    const { TouchableOpacity } = require('react-native')
    fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[0])
    expect(goBack).toHaveBeenCalled()
  })

  it('uses system printer when print is triggered on iOS', async () => {
    const { getByTestId } = renderWithProviders(
      <OrderSummary order={sampleOrder} orderStatus="Pending" />
    )
    fireEvent.press(getByTestId('floating-print'))
    await Promise.resolve()
    expect(RNPrint.print).toHaveBeenCalled()
  })

  it('renders pickup order without delivery fee row', () => {
    const { queryByText } = renderWithProviders(
      <OrderSummary order={{ ...sampleOrder, delivery_type: 2 }} orderStatus="Pending" />
    )
    expect(queryByText('Delivery Fee')).toBeNull()
  })

  it('toggles product accordion details', () => {
    const { getByText } = renderWithProviders(
      <OrderSummary order={richSampleOrder} orderStatus="Pending" />
    )
    fireEvent.press(getByText(/Burger/))
    expect(getByText(/Burger/)).toBeTruthy()
  })

  it('renders cash change details for cash payments', () => {
    const { getByText } = renderWithProviders(
      <OrderSummary
        order={{
          ...sampleOrder,
          cash: 30,
          payment_events: [{
            event: 'payment',
            amount: 25.5,
            paymethod: { gateway: 'cash', name: 'Cash' }
          }]
        }}
        orderStatus="Pending"
      />
    )
    expect(getByText(/Change of/)).toBeTruthy()
  })

  it('renders discount row when summary has discount', () => {
    const { getByText } = renderWithProviders(
      <OrderSummary
        order={{
          ...sampleOrder,
          offer_type: 1,
          offer_rate: 10,
          summary: { ...sampleOrder.summary, discount: 5 }
        }}
        orderStatus="Pending"
      />
    )
    expect(getByText('Discount')).toBeTruthy()
  })

  it('renders service fee when configured on summary', () => {
    const { getByText } = renderWithProviders(
      <OrderSummary
        order={{
          ...sampleOrder,
          summary: { ...sampleOrder.summary, service_fee: 2.5 }
        }}
        orderStatus="Pending"
      />
    )
    expect(getByText(/Service Fee/)).toBeTruthy()
  })

  it('renders tax row when tax type is not included', () => {
    const { getByText } = renderWithProviders(
      <OrderSummary
        order={{
          ...sampleOrder,
          tax_type: 2,
          summary: { ...sampleOrder.summary, tax_rate: 8, tax: 2 }
        }}
        orderStatus="Pending"
      />
    )
    expect(getByText(/Tax/)).toBeTruthy()
  })

  it('renders driver tip when summary includes tip for delivery orders', () => {
    const { getByText } = renderWithProviders(
      <OrderSummary
        order={{
          ...richSampleOrder,
          delivery_type: 1,
          summary: { ...richSampleOrder.summary, driver_tip: 3 }
        }}
        orderStatus="Pending"
      />
    )
    expect(getByText(/Driver tip/)).toBeTruthy()
  })
})
