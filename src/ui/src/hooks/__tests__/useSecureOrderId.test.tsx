import { renderHook } from '@testing-library/react-native'

import { useApi, useLanguage } from '@components'

jest.mock('@components', () => require('../../../../../jest/helpers/mockOrdering'))

import { useSecureOrderId } from '../useSecureOrderId'

const mockProject = (project: string) => {
  (useApi as jest.Mock).mockReturnValue([{ project }])
}

const setup = () => renderHook(() => useSecureOrderId()).result.current

describe('useSecureOrderId', () => {
  describe('outside the secure projects', () => {
    beforeEach(() => mockProject('a-project-without-secure-ids'))

    it('is not flagged as a secure project', () => {
      expect(setup().isSecureProject).toBe(false)
    })

    it('leaves the order id untouched', () => {
      expect(setup().maskOrderId(1234567)).toBe('1234567')
    })

    describe('orderNumberLabel', () => {
      it('is the label, one space and the raw id, for an order and for a bare id', () => {
        expect(setup().orderNumberLabel({ id: 1234567 })).toBe('Order No. 1234567')
        expect(setup().orderNumberLabel(1234567)).toBe('Order No. 1234567')
        expect(setup().orderNumberLabel('1234567')).toBe('Order No. 1234567')
      })
    })
  })

  describe('inside a secure project', () => {
    beforeEach(() => mockProject('quickiedelivery'))

    it('is flagged as a secure project', () => {
      expect(setup().isSecureProject).toBe(true)
    })

    it('hides the last four digits', () => {
      expect(setup().maskOrderId(1234567)).toBe('123****')
    })

    it('hides the whole id when it has exactly four digits', () => {
      expect(setup().maskOrderId(4567)).toBe('****')
    })

    it('hides the whole id when it has fewer than four digits', () => {
      expect(setup().maskOrderId(99)).toBe('**')
    })

    it('returns an empty string for a missing id', () => {
      expect(setup().maskOrderId(undefined)).toBe('')
    })

    it('exposes the visible prefix', () => {
      const { idPrefix } = setup()
      expect(idPrefix(1234567)).toBe('123')
      expect(idPrefix(99)).toBe('')
    })

    it('asks for as many digits as it hides', () => {
      const { pinLength } = setup()
      expect(pinLength(1234567)).toBe(4)
      expect(pinLength(99)).toBe(2)
    })

    describe('displayOrderId', () => {
      it('prefers the external id when the config asks for it', () => {
        const order = { id: 1234567, external_id: 'QD-8891' }
        expect(setup().displayOrderId(order, true)).toBe('QD-8891')
      })

      it('falls back to the masked id when there is no external id', () => {
        const order = { id: 1234567, external_id: null }
        expect(setup().displayOrderId(order, true)).toBe('123****')
      })

      it('masks the id when the config does not ask for the external id', () => {
        const order = { id: 1234567, external_id: 'QD-8891' }
        expect(setup().displayOrderId(order, false)).toBe('123****')
      })
    })

    describe('orderNumberLabel', () => {
      it('masks the id of an order', () => {
        expect(setup().orderNumberLabel({ id: 1234567 })).toBe('Order No. 123****')
      })

      it('masks a bare id (a payout\'s order_id, a map marker\'s id)', () => {
        expect(setup().orderNumberLabel(1234567)).toBe('Order No. 123****')
        expect(setup().orderNumberLabel('4567')).toBe('Order No. ****')
      })

      it('has exactly one space between the label and the id', () => {
        expect(setup().orderNumberLabel(1234567)).toMatch(/^Order No\. \S+$/)
        expect(setup().orderNumberLabel({ id: 1234567 })).toMatch(/^Order No\. \S+$/)
      })

      it('shows the external id only when asked, as displayOrderId does', () => {
        const order = { id: 1234567, external_id: 'QD-8891' }
        expect(setup().orderNumberLabel(order, true)).toBe('Order No. QD-8891')
        expect(setup().orderNumberLabel(order)).toBe('Order No. 123****')
      })

      it('is the label alone without an id', () => {
        expect(setup().orderNumberLabel(undefined)).toBe('Order No.')
        expect(setup().orderNumberLabel({})).toBe('Order No.')
      })

      it('reads its label from the ORDER_NO translation', () => {
        (useLanguage as jest.Mock).mockReturnValueOnce([{}, (key: string) => key])
        expect(setup().orderNumberLabel(1234567)).toBe('ORDER_NO 123****')
      })
    })

    describe('orderNumberShort', () => {
      it('is "No." and the id, masked, of an order or of a bare id', () => {
        expect(setup().orderNumberShort({ id: 1234567 })).toBe('No. 123****')
        expect(setup().orderNumberShort(1234567)).toBe('No. 123****')
      })

      it('shows the external id only when asked', () => {
        const order = { id: 1234567, external_id: 'QD-8891' }
        expect(setup().orderNumberShort(order, true)).toBe('No. QD-8891')
        expect(setup().orderNumberShort(order)).toBe('No. 123****')
      })

      it('is empty without an id', () => {
        expect(setup().orderNumberShort(undefined)).toBe('')
        expect(setup().orderNumberShort({})).toBe('')
      })

      it('reads its label from the ORDER_NO_SHORT translation', () => {
        (useLanguage as jest.Mock).mockReturnValueOnce([{}, (key: string) => key])
        expect(setup().orderNumberShort(1234567)).toBe('ORDER_NO_SHORT 123****')
      })
    })
  })
})
