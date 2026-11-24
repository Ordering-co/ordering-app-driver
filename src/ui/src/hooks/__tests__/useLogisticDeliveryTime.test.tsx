import { renderHook } from '@testing-library/react-native'

import { useConfig } from '@components'
import { useLogisticDeliveryTime } from '../useLogisticDeliveryTime'

/** What the hook gives the sheet for an accepted request, with the controller's answer to the accept. */
const targetFor = (acceptResult: any, handleUpdateLogisticOrdersEta: any = jest.fn()) => {
  const openAcceptSheet = jest.fn()
  const { result } = renderHook(() => useLogisticDeliveryTime({ handleUpdateLogisticOrdersEta, openAcceptSheet }))
  const opened = result.current.requestDeliveryTime(acceptResult)
  return { opened, target: openAcceptSheet.mock.calls[0]?.[0], openAcceptSheet, handleUpdateLogisticOrdersEta }
}

describe('useLogisticDeliveryTime', () => {
  beforeEach(() => {
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
  })

  it('a single request: the sheet of one order, with no group', () => {
    const { opened, target } = targetFor({ order: { id: 101 }, orderIds: [101], defaultEta: null })
    expect(opened).toBe(true)
    expect(target).toMatchObject({ action: 'accept', ids: [101], order: { id: 101 } })
    expect(target.orders).toBeUndefined()
    expect(target.groupId).toBeUndefined()
  })

  it('the sheet saves a time and changes no status, so it is told it has no status photo to ask for (single and group)', () => {
    expect(targetFor({ order: { id: 101 }, orderIds: [101], defaultEta: null }).target.skipsStatusImage).toBe(true)
    const orders = [{ id: 101 }, { id: 102 }]
    expect(targetFor({ order: { id: 101, order_group_id: 9, order_group: { orders } }, orderIds: [101, 102], defaultEta: null }).target.skipsStatusImage).toBe(true)
  })

  it('a grouped request: the sheet gets the group\'s orders and its number', () => {
    const orders = [{ id: 101 }, { id: 102 }]
    const { target } = targetFor({ order: { id: 101, order_group_id: 9, order_group: { orders } }, orderIds: [101, 102], defaultEta: null })
    expect(target.ids).toEqual([101, 102])
    expect(target.orders).toEqual(orders)
    expect(target.groupId).toBe('9')
  })

  it('the number can be the group\'s own id, or on the order the request wraps', () => {
    const orders = [{ id: 1 }, { id: 2 }]
    expect(targetFor({ order: { order_group: { id: 12, orders } }, orderIds: [1, 2] }).target.groupId).toBe('12')
    expect(targetFor({ order: { order: { order_group_id: 13, order_group: { orders } } }, orderIds: [1, 2] }).target.groupId).toBe('13')
  })

  it('a group with no number still speaks for its orders', () => {
    const { target } = targetFor({ order: { order_group: { orders: [{ id: 1 }, { id: 2 }] } }, orderIds: [1, 2] })
    expect(target.orders).toHaveLength(2)
    expect(target.groupId).toBeUndefined()
  })

  it('names only the orders whose time is saved, and a group of one is that one order', () => {
    const { target } = targetFor({ order: { order_group_id: 9, order_group: { orders: [{ id: 1 }, { id: 2 }] } }, orderIds: [1] })
    expect(target.orders).toBeUndefined()
    expect(target.groupId).toBeUndefined()
  })

  it('saves the time of the request\'s orders with the logistic request, and returns what it answered (a failure is null for an order)', async () => {
    const save = jest.fn().mockResolvedValue([{}, null])
    const { target } = targetFor({ order: { id: 1 }, orderIds: [1, 2] }, save)
    expect(await target.handleChangeOrderStatus(8, [1, 2], { delivered_in: 20 }, { withDetails: true })).toEqual([{}, null])
    expect(save).toHaveBeenCalledWith([1, 2], 20)
  })

  it('asks nothing when the project has a default time, hides it, the accept failed or there is nothing to save', () => {
    const accepted = { order: { id: 1 }, orderIds: [1] }
    expect(targetFor({ ...accepted, defaultEta: 10 }).opened).toBe(false)
    expect(targetFor({ ...accepted, error: true }).opened).toBe(false)
    expect(targetFor({ order: { id: 1 }, orderIds: [] }).opened).toBe(false)
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: { hidden_driver_eta_time: { value: '1' } } }])
    expect(targetFor(accepted).opened).toBe(false)
  })
})
