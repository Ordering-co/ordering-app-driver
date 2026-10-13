import { isGroupedOrderStatusInFlight } from '../isGroupedOrderStatusInFlight'

describe('isGroupedOrderStatusInFlight', () => {
  it('is false when nothing is in flight', () => {
    expect(isGroupedOrderStatusInFlight({
      loadingChangeOrder: false,
      submitting: false
    })).toBe(false)
  })

  it('is true when the bulk status update is loading', () => {
    expect(isGroupedOrderStatusInFlight({
      loadingChangeOrder: true,
      submitting: false
    })).toBe(true)
  })

  it('is true while a local submit is in flight', () => {
    expect(isGroupedOrderStatusInFlight({
      loadingChangeOrder: false,
      submitting: true
    })).toBe(true)
  })
})
