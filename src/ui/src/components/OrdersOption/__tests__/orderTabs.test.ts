import {
  endedAtMs,
  groupByCart,
  isNetworkFailure,
  kindOf,
  listsFor,
  markListsStale,
  ordersOfView,
  resolveView,
  splitOrders,
  viewForStatus,
  viewOfList,
  viewsFor,
  withoutApi,
  type ListTags
} from '../orderTabs'

const tags: ListTags = {
  active: [0, 3, 4, 7, 8, 9, 13, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26],
  pending: [0, 13],
  inProgress: [3, 4, 7, 8, 9, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26],
  completed: [1, 11, 15],
  cancelled: [2, 5, 6, 10, 12, 16, 17]
}

const order = (id: number, status: number, extra: any = {}) => ({ id, status, ...extra })
/** A ready-for-pickup order the driver already accepted: his stage (at 8) is after the assignment. */
const accepted = (id: number, stage = 8) => order(id, 4, {
  last_driver_assigned_at: '2026-11-23 09:00:00',
  reporting_data: { at: { [`status:${stage}`]: '2026-11-23T10:00:00.000Z' } }
})

describe('the tabs of the Orders screen', () => {
  describe('what a tab is', () => {
    it('is Assigned, In Progress and History; a project that combines pending and in progress has Active and History', () => {
      expect(viewsFor(false)).toEqual(['assigned', 'inProgress', 'history'])
      expect(viewsFor(true)).toEqual(['active', 'history'])
    })

    it('keeps the tab asked for when the project has it, the requests always, else the first one', () => {
      expect(resolveView('inProgress', false)).toBe('inProgress')
      expect(resolveView('inProgress', true)).toBe('active')
      expect(resolveView('active', false)).toBe('assigned')
      expect(resolveView('history', true)).toBe('history')
      expect(resolveView('logisticOrders', true)).toBe('logisticOrders')
    })

    it('opens on the controller\'s own first list, mapped to the tabs', () => {
      expect(viewOfList('pending', false)).toEqual({ view: 'assigned', filter: 'all' })
      expect(viewOfList('active', true)).toEqual({ view: 'active', filter: 'all' })
      expect(viewOfList('inProgress', false)).toEqual({ view: 'inProgress', filter: 'all' })
      expect(viewOfList('completed', false)).toEqual({ view: 'history', filter: 'completed' })
      expect(viewOfList('cancelled', false)).toEqual({ view: 'history', filter: 'cancelled' })
      expect(viewOfList('logisticOrders', false)).toEqual({ view: 'logisticOrders', filter: 'all' })
      expect(viewOfList(undefined, false)).toEqual({ view: 'assigned', filter: 'all' })
    })

    it('asks the controller for the lists a tab is built on: Assigned both open ones, In Progress its own, History the chip\'s', () => {
      expect(listsFor('assigned', 'all')).toEqual(['pending', 'inProgress'])
      expect(listsFor('inProgress', 'all')).toEqual(['inProgress'])
      expect(listsFor('active', 'all')).toEqual(['active'])
      expect(listsFor('history', 'all')).toEqual(['completed', 'cancelled'])
      expect(listsFor('history', 'completed')).toEqual(['completed'])
      expect(listsFor('history', 'cancelled')).toEqual(['cancelled'])
      expect(listsFor('logisticOrders', 'all')).toEqual([])
    })
  })

  describe('where an order is (Assigned holds what the driver has not accepted, In Progress what he has)', () => {
    it('puts an order at 4 with no stage of the driver\'s own in Assigned', () => {
      expect(kindOf(order(1, 4), tags, false)).toBe('assigned')
    })

    it('puts an order at 4 with the driver\'s stage 8 or 3 in In Progress', () => {
      expect(kindOf(accepted(1, 8), tags, false)).toBe('inProgress')
      expect(kindOf(accepted(2, 3), tags, false)).toBe('inProgress')
    })

    it('does not count a stage from before the assignment (the order was given to another driver and came back)', () => {
      expect(kindOf(order(1, 4, { last_driver_assigned_at: '2026-11-23 11:00:00', reporting_data: { at: { 'status:8': '2026-11-23T10:00:00.000Z' } } }), tags, false)).toBe('assigned')
    })

    it('puts the pending list in Assigned: at 0 and at 13 (a pre-order)', () => {
      expect(kindOf(order(1, 0), tags, false)).toBe('assigned')
      expect(kindOf(order(2, 13), tags, false)).toBe('assigned')
    })

    it('puts the accepted by business and the not ready ones (7, 14) in Assigned: they offer Accept / Reject', () => {
      expect(kindOf(order(1, 7), tags, false)).toBe('assigned')
      expect(kindOf(order(2, 14), tags, false)).toBe('assigned')
    })

    it('puts the driver\'s own steps in In Progress: at 8, at 9, at 26, and the rest of the in-progress statuses', () => {
      for (const status of [3, 8, 9, 18, 19, 20, 21, 22, 23, 24, 25, 26]) expect(kindOf(order(1, status), tags, false)).toBe('inProgress')
    })

    it('puts the finished ones in Completed or Cancelled, whichever list the controller had them in', () => {
      for (const status of [1, 11, 15]) expect(kindOf(order(1, status), tags, false)).toBe('completed')
      for (const status of [2, 5, 6, 10, 12, 16, 17]) expect(kindOf(order(1, status), tags, false)).toBe('cancelled')
      expect(kindOf(order(1, 99), tags, false)).toBeNull()
    })

    it('a project that combines its tabs has one for every open order, offered or not', () => {
      expect(kindOf(order(1, 0), tags, true)).toBe('active')
      expect(kindOf(order(2, 4), tags, true)).toBe('active')
      expect(kindOf(order(3, 8), tags, true)).toBe('active')
      expect(kindOf(order(4, 11), tags, true)).toBe('completed')
    })
  })

  describe('the split of the controller\'s lists', () => {
    it('takes the orders of every list once, by their status: an order in the pending list the queue moved to 8 is In Progress', () => {
      const split = splitOrders({
        pending: [order(1, 0), order(2, 8)],
        inProgress: [order(3, 4), accepted(4), order(5, 9)],
        completed: [order(6, 11)],
        cancelled: [order(7, 5)]
      }, tags, false)
      expect(split.assigned.map((o) => o.id)).toEqual([3, 1])
      expect(split.inProgress.map((o) => o.id)).toEqual([5, 4, 2])
      expect(split.completed.map((o) => o.id)).toEqual([6])
      expect(split.cancelled.map((o) => o.id)).toEqual([7])
    })

    it('keeps one copy of an order that is in two lists: the newest (`updated_at`), whatever list holds it, classified by its status', () => {
      // It left In Progress outside the app: the old copy is still in the in-progress list, the new one is in the cancelled list.
      const staleInProgress = splitOrders({
        inProgress: [order(1, 8, { updated_at: '2026-11-23 10:00:00' })],
        cancelled: [order(1, 5, { updated_at: '2026-11-23 11:00:00' })]
      }, tags, false)
      expect(staleInProgress.cancelled.map((o) => o.id)).toEqual([1])
      expect(staleInProgress.inProgress).toEqual([])
      // The other way round: the old copy is in the list that comes later, the new one in the earlier one.
      const staleCancelled = splitOrders({
        inProgress: [order(1, 8, { updated_at: '2026-11-23 12:00:00' })],
        cancelled: [order(1, 5, { updated_at: '2026-11-23 11:00:00' })]
      }, tags, false)
      expect(staleCancelled.inProgress.map((o) => o.id)).toEqual([1])
      expect(staleCancelled.cancelled).toEqual([])
      // The same instant in two writings (the API's `T` and a space) is the same.
      const sameInstant = splitOrders({
        pending: [order(1, 0, { updated_at: '2026-11-23T10:00:00.000Z', name: 'pending' })],
        inProgress: [order(1, 0, { updated_at: '2026-11-23 10:00:00', name: 'in progress' })]
      }, tags, false, { pending: 9, inProgress: 3 })
      expect(sameInstant.assigned[0].name).toBe('pending')
    })

    it('with the same or no `updated_at`, the copy of the list loaded most recently wins', () => {
      const lists = { pending: [order(1, 0, { name: 'pending' })], inProgress: [order(1, 4, { name: 'in progress' })] }
      expect(splitOrders(lists, tags, false, { pending: 5, inProgress: 2 }).assigned[0].name).toBe('pending')
      expect(splitOrders(lists, tags, false, { pending: 2, inProgress: 5 }).assigned[0].name).toBe('in progress')
      // One of them has none: it is no newer than the other.
      const one = { pending: [order(1, 0, { name: 'pending', updated_at: '2026-11-23 10:00:00' })], inProgress: [order(1, 4, { name: 'in progress' })] }
      expect(splitOrders(one, tags, false, { pending: 1, inProgress: 2 }).assigned[0].name).toBe('in progress')
    })

    it('hands the cards a plain order: the SDK\'s `api` (its client, a function) never goes to the details as a route param', () => {
      const api = { ordering: { setAccessToken: () => undefined } }
      const loaded = [order(1, 11, { api, name: 'a' }), order(2, 11, { name: 'b' })]
      const split = splitOrders({ completed: loaded }, tags, false)
      const [second, first] = split.completed
      expect(first.api).toBeUndefined()
      expect(first.name).toBe('a')
      expect(second).toBe(loaded[1])
      // The same plain copy for the same order, so a row that did not change is not drawn again.
      expect(splitOrders({ completed: loaded }, tags, false).completed[1]).toBe(first)
      expect(withoutApi(loaded[0])).toBe(first)
      expect(loaded[0].api).toBe(api)
    })

    it('reads the orders of a group as the lists keep them', () => {
      const split = splitOrders({ pending: [[['7', [order(1, 0), order(2, 0)]]]] }, tags, false)
      expect(split.assigned.map((o) => o.id)).toEqual([2, 1])
    })

    it('does not read the list of the other layout (the combined one is only for a project that combines)', () => {
      expect(splitOrders({ active: [order(1, 8)] }, tags, false).inProgress).toEqual([])
      expect(splitOrders({ pending: [order(1, 0)] }, tags, true).active).toEqual([])
    })
  })

  describe('History', () => {
    const split = splitOrders({
      completed: [
        order(1, 11, { reporting_data: { at: { 'status:11': '2026-11-23T10:00:00.000Z' } } }),
        order(3, 11, { reporting_data: { at: { 'status:11': '2026-11-23T09:00:00.000Z' } } })
      ],
      cancelled: [order(2, 5, { reporting_data: { at: { 'status:5': '2026-11-23T11:00:00.000Z' } } })]
    }, tags, false)

    it('shows both lists together, the latest ended first (not by id)', () => {
      expect(ordersOfView(split, 'history', 'all').map((o) => o.id)).toEqual([2, 1, 3])
    })

    it('shows each chip\'s own list as the controller keeps it, newest id first', () => {
      expect(ordersOfView(split, 'history', 'completed').map((o) => o.id)).toEqual([3, 1])
      expect(ordersOfView(split, 'history', 'cancelled').map((o) => o.id)).toEqual([2])
    })

    it('dates an order as its card does: the moment it reached its last status, else its delivery time', () => {
      expect(endedAtMs(order(1, 11, { reporting_data: { at: { 'status:11': '2026-11-23T10:00:00.000Z' } } }))).toBe(Date.UTC(2026, 10, 23, 10))
      expect(endedAtMs(order(1, 11, { delivery_datetime_utc: '2026-11-23 08:30:00' }))).toBe(Date.UTC(2026, 10, 23, 8, 30))
      expect(endedAtMs(order(1, 11))).toBe(0)
    })

    it('breaks a tie by id, newest first', () => {
      const same = splitOrders({ completed: [order(1, 11)], cancelled: [order(2, 5)] }, tags, false)
      expect(ordersOfView(same, 'history', 'all').map((o) => o.id)).toEqual([2, 1])
    })
  })

  describe('the rows', () => {
    it('groups the orders of a cart together, where the first of them is', () => {
      const rows = groupByCart([order(5, 0), order(4, 0, { cart_group_id: 9 }), order(3, 0), order(2, 0, { cart_group_id: 9 })])
      expect(rows).toHaveLength(3)
      expect(rows[0].id).toBe(5)
      expect(rows[1]).toEqual([['9', [expect.objectContaining({ id: 4 }), expect.objectContaining({ id: 2 })]]])
      expect(rows[2].id).toBe(3)
    })
  })

  describe('the tab an order\'s status is shown in (the new-order alert)', () => {
    it('a new assigned order opens Assigned', () => {
      for (const status of [0, 13, 4, 7, 14]) expect(viewForStatus(status, tags, false)).toEqual({ view: 'assigned', filter: 'all' })
    })

    it('an order the driver has taken on opens In Progress, a finished one History', () => {
      expect(viewForStatus(8, tags, false)).toEqual({ view: 'inProgress', filter: 'all' })
      expect(viewForStatus(11, tags, false)).toEqual({ view: 'history', filter: 'all' })
      expect(viewForStatus(2, tags, true)).toEqual({ view: 'history', filter: 'all' })
    })

    it('no status, or one no list holds, opens the first tab; a combined project\'s open order opens Active', () => {
      expect(viewForStatus(undefined, tags, false).view).toBe('assigned')
      expect(viewForStatus(99, tags, false).view).toBe('assigned')
      expect(viewForStatus(8, tags, true).view).toBe('active')
      expect(viewForStatus(undefined, tags, true).view).toBe('active')
    })
  })

  it('marks a list as not loaded without touching its rows or the other lists', () => {
    const groups = { pending: { orders: [1], fetched: true, error: ['x'] }, inProgress: { orders: [2], fetched: true } }
    const next = markListsStale(groups, ['pending'])
    expect(next.pending).toEqual({ orders: [1], fetched: false, error: null })
    expect(next.inProgress).toBe(groups.inProgress)
  })
})

describe('isNetworkFailure: a load that could not reach the API, not the API\'s answer about the list', () => {
  it('is what the controller writes when the request itself throws (an XHR error has no message), and a network message', () => {
    expect(isNetworkFailure(['ERROR'], false)).toBe(true)
    expect(isNetworkFailure(['Network request failed'], false)).toBe(true)
    expect(isNetworkFailure(['Network Error'], false)).toBe(true)
  })

  it('is not an error the API answered (a refused token, a bad query) or a server failure, with a connection', () => {
    expect(isNetworkFailure(['Unauthorized'], false)).toBe(false)
    expect(isNetworkFailure(['Internal error'], false)).toBe(false)
    expect(isNetworkFailure([{ message: 'Server error' }], false)).toBe(false)
    expect(isNetworkFailure(['ERROR', 'Unauthorized'], false)).toBe(false)
  })

  it('is any error of a load while the connection says there is none', () => {
    expect(isNetworkFailure(['Unauthorized'], true)).toBe(true)
    expect(isNetworkFailure([{ message: 'Server error' }], true)).toBe(true)
  })

  it('is nothing when there is no error', () => {
    expect(isNetworkFailure(null, true)).toBe(false)
    expect(isNetworkFailure([], true)).toBe(false)
    expect(isNetworkFailure(undefined, false)).toBe(false)
    expect(isNetworkFailure([''], true)).toBe(false)
  })
})
