import { getPushOpenOrderPlan } from '../getPushOpenOrderPlan'

const orderDetails = {
  id: 42,
  assignId: null,
  group_id: null
}

const logistic = {
  id: null,
  assignId: 9,
  group_id: null
}

describe('getPushOpenOrderPlan', () => {
  it('keeps a pending order while logged out', () => {
    expect(getPushOpenOrderPlan({
      loaded: true,
      auth: false,
      orderId: orderDetails
    })).toEqual({
      shouldClear: false,
      screen: null,
      orderId: null,
      orderAssingId: null
    })
  })

  it('opens Order Details after login when a push order id is pending', () => {
    expect(getPushOpenOrderPlan({
      loaded: true,
      auth: true,
      orderId: orderDetails
    })).toEqual({
      shouldClear: true,
      screen: 'OrderDetails',
      orderId: 42,
      orderAssingId: null
    })
  })

  it('opens logistic details after login when an assign id is pending', () => {
    expect(getPushOpenOrderPlan({
      loaded: true,
      auth: true,
      orderId: logistic
    })).toEqual({
      shouldClear: true,
      screen: 'OrderDetailsLogistic',
      orderId: null,
      orderAssingId: 9
    })
  })

  it('does not open when boot is not loaded yet', () => {
    expect(getPushOpenOrderPlan({
      loaded: false,
      auth: true,
      orderId: orderDetails
    }).screen).toBeNull()
  })

  it('does not open when there is no pending order', () => {
    expect(getPushOpenOrderPlan({
      loaded: true,
      auth: true,
      orderId: { id: null, assignId: null, group_id: null }
    })).toEqual({
      shouldClear: false,
      screen: null,
      orderId: null,
      orderAssingId: null
    })
  })
})
