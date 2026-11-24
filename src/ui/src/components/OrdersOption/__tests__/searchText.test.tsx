import '../../../../../../jest/helpers/uiModuleMocks'
import React from 'react'
import { Platform } from 'react-native'
import { fireEvent } from '@testing-library/react-native'

import { useConfig } from '@components'

jest.mock('../../../providers/StoreUtil', () => ({
  _retrieveStoreData: jest.fn().mockResolvedValue(null),
  _setStoreData: jest.fn(),
  _removeStoreData: jest.fn()
}))

jest.mock('@ui', () => {
  const { pickUi } = require('../../../../../../jest/helpers/uiModuleMocks')
  const { buildD3OrdersIntegrationUiMock } = require('../../../../../../jest/helpers/d3OrdersUiMock')
  return pickUi({ ...buildD3OrdersIntegrationUiMock(), NewOrderNotification: () => null }, ['NotificationSetting', 'WebsocketStatus', 'useOfflineActions', 'ReviewCustomer'])
})

jest.mock('../../../../../context/SocketReconnectContext', () => ({ useOnReconnect: () => {} }))

jest.mock('@components', () => {
  const { getMock } = require('../../../../../../jest/helpers/d3OrdersComponentsMock')
  return getMock()
})

import { OrdersOption } from '..'
import { SEARCH_ENCODES_PERCENT, searchTerm } from '../searchText'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

/**
 * The orders search writes the order number into an `ilike` the controller wraps in `%…%`. The SDK puts the
 * `where` in the query string raw, so on iOS the "%34" of "%3460%" reached the server as the character "4" and the
 * search never found the order. The controller encodes the text for what is not iOS: both platforms take that path.
 */
describe('the orders search text', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
  })

  describe('searchTerm', () => {
    it('leaves digits, accents, spaces and a percent sign as the driver typed them (the controller encodes them)', () => {
      expect(searchTerm('3460')).toBe('3460')
      expect(searchTerm('%')).toBe('%')
      expect(searchTerm('ñandú café')).toBe('ñandú café')
      expect(searchTerm('  3460  ')).toBe('3460')
    })

    it('leaves a semicolon and an equals sign as typed: they travel inside the value of a query string whole', () => {
      expect(searchTerm('a;b')).toBe('a;b')
      expect(searchTerm('a=b')).toBe('a=b')
    })

    it('never lets an ampersand, a hash or a plus cut or change the query: it asks for any character there', () => {
      expect(searchTerm('a&b')).toBe('a_b')
      expect(searchTerm('a#b')).toBe('a_b')
      expect(searchTerm('1+2')).toBe('1_2')
    })

    it('is empty for what is not a text', () => {
      expect(searchTerm(undefined)).toBe('')
      expect(searchTerm(null)).toBe('')
      expect(searchTerm(34)).toBe('')
    })
  })

  describe('what the tab sends the controller', () => {
    const typeAndSearch = (screen: any, text: string) => {
      fireEvent.press(screen.getByLabelText('Search orders'))
      fireEvent.changeText(screen.getByPlaceholderText('Order number'), text)
      fireEvent.press(screen.getByText('Search'))
    }

    it.each([
      ['3460', '3460'],
      ['%', '%'],
      ['a&b', 'a_b'],
      ['ñ', 'ñ']
    ])('searching "%s" asks for "%s"', (typed, sent) => {
      const onFiltered = jest.fn()
      const screen = renderWithProviders(<OrdersOption isDriverApp onFiltered={onFiltered} />)
      typeAndSearch(screen, typed)
      expect(onFiltered).toHaveBeenCalledWith(expect.objectContaining({ id: sent }))
    })

    it('encodes the external id the same way', () => {
      const onFiltered = jest.fn()
      const screen = renderWithProviders(<OrdersOption isDriverApp onFiltered={onFiltered} />)
      fireEvent.press(screen.getByLabelText('Search orders'))
      fireEvent.changeText(screen.getByPlaceholderText('External id'), 'ext&1#')
      fireEvent.press(screen.getByText('Search'))
      expect(onFiltered).toHaveBeenCalledWith(expect.objectContaining({ external_id: 'ext_1_' }))
    })

    it.each(['ios', 'android'])('asks the controller for its encoded path on %s', (os) => {
      const replaced = jest.replaceProperty(Platform, 'OS', os as any)
      const components = require('@components')
      const original = components.OrderListGroups
      components.OrderListGroups = jest.fn(original)
      try {
        renderWithProviders(<OrdersOption isDriverApp />)
        // `isIos` true is the controller's raw path: "%3460%" unencoded.
        expect(components.OrderListGroups.mock.calls[0][0].isIos).toBe(!SEARCH_ENCODES_PERCENT)
        expect(components.OrderListGroups.mock.calls[0][0].isIos).toBe(false)
      } finally {
        components.OrderListGroups = original
        replaced.restore()
      }
    })
  })
})
