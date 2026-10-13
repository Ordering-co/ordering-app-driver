import {
  getOrderDetailsAcceptLoading,
  shouldCloseAcceptModalOnStatusChange
} from '../getOrderDetailsAcceptModalPlan'

describe('getOrderDetailsAcceptLoading', () => {
  it('is idle when neither flag is set', () => {
    expect(getOrderDetailsAcceptLoading({
      orderLoading: false,
      loadingOrder: false
    })).toEqual({
      loading: false,
      isLoadingOrder: false
    })
  })

  it('treats controller loading as in flight', () => {
    expect(getOrderDetailsAcceptLoading({
      orderLoading: true,
      loadingOrder: false
    })).toEqual({
      loading: true,
      isLoadingOrder: true
    })
  })

  it('treats local loadingOrder as in flight', () => {
    expect(getOrderDetailsAcceptLoading({
      orderLoading: false,
      loadingOrder: true
    })).toEqual({
      loading: true,
      isLoadingOrder: true
    })
  })
})

describe('shouldCloseAcceptModalOnStatusChange', () => {
  it('does not close when the modal is closed', () => {
    expect(shouldCloseAcceptModalOnStatusChange({
      acceptModalOpen: false,
      orderStatus: 8,
      previousOrderStatus: 0
    })).toBe(false)
  })

  it('does not close on the first status snapshot', () => {
    expect(shouldCloseAcceptModalOnStatusChange({
      acceptModalOpen: true,
      orderStatus: 0,
      previousOrderStatus: undefined
    })).toBe(false)
  })

  it('does not close when status is unchanged', () => {
    expect(shouldCloseAcceptModalOnStatusChange({
      acceptModalOpen: true,
      orderStatus: 0,
      previousOrderStatus: 0
    })).toBe(false)
  })

  it('closes when status changes while the modal is open', () => {
    expect(shouldCloseAcceptModalOnStatusChange({
      acceptModalOpen: true,
      orderStatus: 8,
      previousOrderStatus: 0
    })).toBe(true)
  })
})
