import { renderHook } from '@testing-library/react-native'

import { useApi, useConfig } from '@components'

jest.mock('@components', () => require('../../../../../jest/helpers/mockOrdering'))

import { useDeliveryPin } from '../useDeliveryPin'

const mockSetting = (value?: string) => {
  (useConfig as jest.Mock).mockReturnValue([{
    configs: value === undefined ? {} : { delivery_pin_enabled: { value } }
  }])
}

const setup = () => renderHook(() => useDeliveryPin()).result.current

const order = { id: 1234567, delivery_pin_status: 'requested' }

describe('useDeliveryPin', () => {
  it('does not require the pin with the setting off', () => {
    mockSetting('0')
    expect(setup().isDeliveryPinEnabled).toBe(false)
    expect(setup().requiresDeliveryPin(order)).toBe(false)
  })

  it('treats a project without the setting as off', () => {
    mockSetting()
    expect(setup().requiresDeliveryPin(order)).toBe(false)
  })

  describe('with the setting on', () => {
    beforeEach(() => mockSetting('1'))

    it('requires the pin of an order that has one', () => {
      expect(setup().requiresDeliveryPin(order)).toBe(true)
    })

    it('does not require it from an order created without one', () => {
      const { requiresDeliveryPin } = setup()
      expect(requiresDeliveryPin({ id: 1, delivery_pin_status: null })).toBe(false)
      expect(requiresDeliveryPin({ id: 1 })).toBe(false)
      expect(requiresDeliveryPin(undefined)).toBe(false)
    })

    it('does not ask again once the pin was validated', () => {
      expect(setup().requiresDeliveryPin({ id: 1, delivery_pin_status: 'validated' })).toBe(false)
    })
  })

  describe('in quickiedelivery and luisv4plus', () => {
    const legacyOrder = { id: 1234567 }

    beforeEach(() => {
      (useApi as jest.Mock).mockReturnValue([{ project: 'quickiedelivery' }])
    })

    afterEach(() => {
      (useApi as jest.Mock).mockReturnValue([{ get: jest.fn(), post: jest.fn() }, {}])
    })

    it('keeps the pin from the order id while the setting is off', () => {
      mockSetting('0')
      const { usesLegacyPin, requiresDeliveryPin, deliveryPinLength, deliveryPinPrefix } = setup()
      expect(usesLegacyPin).toBe(true)
      expect(requiresDeliveryPin(legacyOrder)).toBe(true)
      expect(deliveryPinLength(legacyOrder)).toBe(4)
      expect(deliveryPinPrefix(legacyOrder)).toBe('123')
    })

    it('checks the last digits of the order id on the phone', () => {
      mockSetting('0')
      const { isLegacyPinValid, isDeliveryPinComplete } = setup()
      expect(isLegacyPinValid(legacyOrder, '4567')).toBe(true)
      expect(isLegacyPinValid(legacyOrder, '4568')).toBe(false)
      expect(isDeliveryPinComplete('4567', legacyOrder)).toBe(true)
    })

    it('takes the whole id when it is shorter than the pin', () => {
      mockSetting('0')
      const { deliveryPinLength, deliveryPinPrefix, isLegacyPinValid } = setup()
      expect(deliveryPinLength({ id: 99 })).toBe(2)
      expect(deliveryPinPrefix({ id: 99 })).toBe('')
      expect(isLegacyPinValid({ id: 99 }, '99')).toBe(true)
    })

    it('switches to the pin from the API once the setting is on', () => {
      mockSetting('1')
      const { usesLegacyPin, requiresDeliveryPin, deliveryPinPrefix, isLegacyPinValid } = setup()
      expect(usesLegacyPin).toBe(false)
      expect(requiresDeliveryPin(legacyOrder)).toBe(false)
      expect(requiresDeliveryPin({ ...legacyOrder, delivery_pin_status: 'requested' })).toBe(true)
      expect(deliveryPinPrefix(legacyOrder)).toBe('')
      expect(isLegacyPinValid(legacyOrder, '0000')).toBe(true)
    })
  })

  it('does not ask for any pin in other projects with the setting off', () => {
    mockSetting('0')
    const { usesLegacyPin, requiresDeliveryPin } = setup()
    expect(usesLegacyPin).toBe(false)
    expect(requiresDeliveryPin({ id: 1234567 })).toBe(false)
  })

  it('only takes a pin of four digits as complete', () => {
    mockSetting('1')
    const { isDeliveryPinComplete } = setup()
    expect(isDeliveryPinComplete('0427')).toBe(true)
    expect(isDeliveryPinComplete('042')).toBe(false)
    expect(isDeliveryPinComplete('04a7')).toBe(false)
    expect(isDeliveryPinComplete('')).toBe(false)
    expect(isDeliveryPinComplete(undefined)).toBe(false)
  })
})
