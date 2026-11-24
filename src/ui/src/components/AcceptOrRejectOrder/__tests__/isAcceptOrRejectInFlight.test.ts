import { isAcceptOrRejectInFlight } from '../isAcceptOrRejectInFlight'

describe('isAcceptOrRejectInFlight', () => {
  it('is false when nothing is in flight', () => {
    expect(isAcceptOrRejectInFlight({
      loading: false,
      isLoadingOrder: false,
      submitting: false
    })).toBe(false)
  })

  it('is true when Order Details loading is set', () => {
    expect(isAcceptOrRejectInFlight({
      loading: true,
      isLoadingOrder: false,
      submitting: false
    })).toBe(true)
  })

  it('is true when isLoadingOrder is set', () => {
    expect(isAcceptOrRejectInFlight({
      loading: false,
      isLoadingOrder: true,
      submitting: false
    })).toBe(true)
  })

  it('is true while a local submit is in flight', () => {
    expect(isAcceptOrRejectInFlight({
      loading: false,
      isLoadingOrder: false,
      submitting: true
    })).toBe(true)
  })
})
