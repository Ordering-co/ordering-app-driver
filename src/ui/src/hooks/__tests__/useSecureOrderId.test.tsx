import { renderHook } from '@testing-library/react-native'

import { useApi } from '@components'

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

    describe('validatePin', () => {
      it('accepts the hidden digits', () => {
        expect(setup().validatePin(1234567, '4567')).toBe(true)
      })

      it('rejects a wrong code', () => {
        expect(setup().validatePin(1234567, '4568')).toBe(false)
      })

      it('rejects the visible prefix', () => {
        expect(setup().validatePin(1234567, '1234')).toBe(false)
      })

      it('rejects an incomplete code', () => {
        expect(setup().validatePin(1234567, '456')).toBe(false)
      })

      it('rejects an empty code', () => {
        const { validatePin } = setup()
        expect(validatePin(1234567, '')).toBe(false)
        expect(validatePin(1234567, undefined)).toBe(false)
      })

      it('rejects everything when there is no order id', () => {
        expect(setup().validatePin(undefined, '4567')).toBe(false)
      })

      it('takes the whole id when it is shorter than the pin', () => {
        const { validatePin } = setup()
        expect(validatePin(99, '99')).toBe(true)
        expect(validatePin(99, '9')).toBe(false)
      })
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
  })
})
