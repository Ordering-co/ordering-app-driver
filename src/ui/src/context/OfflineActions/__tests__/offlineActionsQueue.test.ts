import {
  MAX_REFUSALS,
  RETRY_DELAYS_MS,
  RETRY_EVERY_MS,
  applyQueuedChanges,
  applyRunResults,
  bodyToSync,
  classifyAnswer,
  flatOrders,
  getOfflineActionsAfterReplay,
  isOrderQueued,
  parseStoredOfflineActions,
  retryDelay,
  showQueuedStages
} from '../offlineActionsQueue'

describe('parseStoredOfflineActions', () => {
  it('returns an empty object when storage is null', () => {
    expect(parseStoredOfflineActions(null)).toEqual({})
  })

  it('returns an empty object when storage is undefined', () => {
    expect(parseStoredOfflineActions(undefined)).toEqual({})
  })

  it('returns an empty object when storage is an array leftover', () => {
    expect(parseStoredOfflineActions([])).toEqual({})
  })

  it('keeps a keyed queue object', () => {
    const queued = {
      '101': [{ event: 'evt_off_change_order_status', data: { orderId: 101, body: { status: 7 } } }]
    }
    expect(parseStoredOfflineActions(queued)).toEqual(queued)
  })
})

describe('getOfflineActionsAfterReplay', () => {
  const queued = {
    '101': [{ data: { orderId: 101, body: { status: 7 } } }],
    '202': [{ data: { orderId: 202, body: { status: 12 } } }]
  }

  it('keeps failed order ids so reconnect can retry them', () => {
    expect(getOfflineActionsAfterReplay({
      queued,
      succeededOrderIds: [101]
    })).toEqual({
      remaining: {
        '202': queued['202']
      },
      shouldClearAll: false
    })
  })

  it('clears storage only when every queued order succeeded', () => {
    expect(getOfflineActionsAfterReplay({
      queued,
      succeededOrderIds: [101, 202]
    })).toEqual({
      remaining: {},
      shouldClearAll: true
    })
  })

  it('keeps the full queue when no replay succeeded', () => {
    expect(getOfflineActionsAfterReplay({
      queued,
      succeededOrderIds: []
    })).toEqual({
      remaining: queued,
      shouldClearAll: false
    })
  })
})

const change = (orderId: number, body: any) => ({ event: 'evt_off_change_order_status', data: { orderId, body: { id: orderId, ...body } } })
const tabs = [
  { title: 'pending', tags: [0, 13] },
  { title: 'inProgress', tags: [3, 4, 7, 8, 9, 14] },
  { title: 'completed', tags: [1, 11, 15] },
  { title: 'cancelled', tags: [2, 5, 6, 10, 12] }
]

describe('isOrderQueued: the queue decides whether an order is marked as pending sync', () => {
  it('is true while the queue holds a change for the order, by id as a number or as the text the storage keys it by', () => {
    const actions = { '101': [change(101, { status: 3 })] }
    expect(isOrderQueued(actions, 101)).toBe(true)
    expect(isOrderQueued(actions, '101')).toBe(true)
  })

  it('is false for an order with no change, an empty list, an empty queue and nothing', () => {
    expect(isOrderQueued({ '101': [change(101, { status: 3 })] }, 102)).toBe(false)
    expect(isOrderQueued({ '101': [] }, 101)).toBe(false)
    expect(isOrderQueued({}, 101)).toBe(false)
    expect(isOrderQueued(undefined, 101)).toBe(false)
    expect(isOrderQueued({ '101': [change(101, {})] }, undefined)).toBe(false)
  })
})

describe('flatOrders: the orders of a stored list wherever they are kept', () => {
  it('takes the orders out of a group as the list holds it, and keeps the last copy of an order that is twice', () => {
    const list = [{ id: 1, status: 8 }, [['57', [{ id: 2, status: 8 }, { id: 3, status: 8 }]]], { id: 2, status: 3 }]
    expect(flatOrders(list).map((order) => [order.id, order.status])).toEqual([[1, 8], [3, 8], [2, 3]])
  })

  it('is empty for what is not a list', () => {
    expect(flatOrders(null)).toEqual([])
    expect(flatOrders(undefined)).toEqual([])
  })
})

describe('applyQueuedChanges: the stored lists with the queue on top', () => {
  const lists = () => ({
    pending: [{ id: 103, status: 0 }],
    inProgress: [{ id: 101, status: 8, unsync: true, oldStatus: 4 }, { id: 102, status: 8 }, { id: 104, status: 9 }],
    completed: []
  })
  const actions = {
    '101': [change(101, { status: 8 }), change(101, { status: 3 })],
    '102': [change(102, { status: 3 })],
    '103': [change(103, { status: 8, delivered_in: 30, delivery_position: 2 })]
  }

  it('shows the last queued status of each order, marked, and the first status it had stays as `oldStatus`', () => {
    const shown = applyQueuedChanges(lists(), actions, tabs)
    const byId = (id: number) => shown.inProgress.find((order) => order.id === id)
    expect(byId(101)).toEqual(expect.objectContaining({ status: 3, unsync: true, oldStatus: 4 }))
    expect(byId(102)).toEqual(expect.objectContaining({ status: 3, unsync: true, oldStatus: 8 }))
  })

  it('moves an order to the list of its new status, with the delivery position chosen', () => {
    const shown = applyQueuedChanges(lists(), actions, tabs)
    expect(shown.pending).toEqual([])
    expect(shown.inProgress.find((order) => order.id === 103)).toEqual(expect.objectContaining({ status: 8, unsync: true, delivery_position: 2 }))
  })

  it('leaves the orders the queue does not touch where and as they were', () => {
    const shown = applyQueuedChanges(lists(), actions, tabs)
    expect(shown.inProgress.find((order) => order.id === 104)).toEqual({ id: 104, status: 9 })
  })

  it('finds an order stored inside a group, and puts it back as a plain order of the list it belongs to', () => {
    const stored = { inProgress: [[['57', [{ id: 101, status: 8 }, { id: 102, status: 8 }]]]] }
    const shown = applyQueuedChanges(stored, { '101': [change(101, { status: 3 })], '102': [change(102, { status: 3 })] }, tabs)
    expect(shown.inProgress.map((order) => [order.id, order.status, order.unsync])).toEqual([[102, 3, true], [101, 3, true]])
  })

  it('is the plain lists when the queue is empty', () => {
    expect(applyQueuedChanges(lists(), {}, tabs).inProgress.map((order) => order.id)).toEqual([101, 102, 104])
  })

  it('keeps an order that is not in any list out (nothing to show it in)', () => {
    const shown = applyQueuedChanges(lists(), { '999': [change(999, { status: 3 })] }, tabs)
    expect(Object.values(shown).flat().some((order) => order.id === 999)).toBe(false)
  })
})

describe('bodyToSync: what a sync sends for an order', () => {
  it('is the last change\'s body', () => {
    expect(bodyToSync([change(1, { status: 8 }), change(1, { status: 3 })])).toEqual({ id: 1, status: 3 })
  })

  it('carries the delivery position of an earlier change when the last has none (the accept\'s, then a step)', () => {
    expect(bodyToSync([change(1, { status: 8, delivery_position: 2, delivered_in: 30 }), change(1, { status: 3 })]))
      .toEqual({ id: 1, status: 3, delivery_position: 2 })
  })

  it('keeps the last change\'s own position, and a lone change as it is', () => {
    expect(bodyToSync([change(1, { delivery_position: 1 }), change(1, { status: 3, delivery_position: 4 })]).delivery_position).toBe(4)
    expect(bodyToSync([change(1, { status: 8, delivery_position: 2 })])).toEqual({ id: 1, status: 8, delivery_position: 2 })
  })
})

describe('retryDelay: 15 s, 30 s, 1 min, then every 2 min', () => {
  it('follows the schedule by the number of tries', () => {
    expect([0, 1, 2, 3, 4, 10].map(retryDelay)).toEqual([15000, 30000, 60000, 120000, 120000, 120000])
    expect(RETRY_DELAYS_MS).toEqual([15000, 30000, 60000])
    expect(RETRY_EVERY_MS).toBe(120000)
    expect(MAX_REFUSALS).toBe(3)
  })
})

describe('classifyAnswer: what a request of the sync came to', () => {
  const answer = (status: number | undefined, error: boolean, result: any = ['x']) => ({ status, content: { error, result } })

  it('is sent when the API took the change', () => {
    expect(classifyAnswer(answer(200, false, { id: 1 }))).toEqual({ kind: 'sent' })
  })

  it.each([[408], [429], [500], [503]])('is transient for a %i, and for no answer at all', (status) => {
    expect(classifyAnswer(answer(status, true))).toEqual({ kind: 'transient' })
    expect(classifyAnswer(undefined)).toEqual({ kind: 'transient' })
  })

  it('is refused for a 4xx that carries an error, with the API\'s answer, and for an error with no status', () => {
    expect(classifyAnswer(answer(400, true, ['Location is outdated']))).toEqual({ kind: 'refused', result: ['Location is outdated'] })
    expect(classifyAnswer(answer(422, true))).toEqual({ kind: 'refused', result: ['x'] })
    expect(classifyAnswer(answer(undefined, true))).toEqual({ kind: 'refused', result: ['x'] })
  })

  it('leaves a 401 alone', () => {
    expect(classifyAnswer(answer(401, true))).toEqual({ kind: 'auth' })
  })
})

describe('applyRunResults: the queue after a run, on top of what the storage holds', () => {
  it('takes out what was sent or dropped, and only what the run read: a change queued meanwhile stays', () => {
    const current = { '1': [change(1, { status: 8 }), change(1, { status: 3 })], '2': [change(2), change(2, { status: 9 })], '3': [change(3)] }
    const next = applyRunResults(current, {
      '1': { outcome: 'sent', count: 2, told: true },
      '2': { outcome: 'dropped', count: 1, told: false }
    })
    expect(next).toEqual({ '2': [change(2, { status: 9 })], '3': [change(3)] })
  })

  it('counts a refusal on the last change the run read, and marks the earlier ones told', () => {
    const next = applyRunResults({ '1': [change(1, { status: 8 }), change(1, { status: 3 })] }, { '1': { outcome: 'refused', count: 2, told: true } })
    expect(next['1']).toEqual([{ ...change(1, { status: 8 }), told: true }, { ...change(1, { status: 3 }), attempts: 1 }])
    const again = applyRunResults(next, { '1': { outcome: 'refused', count: 2, told: true } })
    expect(again['1'][1].attempts).toBe(2)
  })

  it('a transient failure or a 401 changes no count; the earlier changes are still marked told when they were', () => {
    const queue = { '1': [change(1, { status: 8 }), change(1, { status: 3 })] }
    expect(applyRunResults(queue, { '1': { outcome: 'transient', count: 2, told: false } })).toEqual(queue)
    expect(applyRunResults(queue, { '1': { outcome: 'auth', count: 2, told: true } })['1'][0].told).toBe(true)
  })

  it('leaves alone an order the run did not read or that is no longer as long as it read', () => {
    const queue = { '1': [change(1)], '2': [change(2)] }
    expect(applyRunResults(queue, { '1': { outcome: 'sent', count: 3, told: false } })).toEqual(queue)
  })
})

describe('showQueuedStages: a queued change that waits keeps its stage on the card, online', () => {
  const actions = { '101': [change(101, { status: 3 })], '102': [change(102, { status: 8, delivery_position: 2 })] }

  it('shows the queued status and position in place, in a group too, and leaves the others as they are', () => {
    const list = [{ id: 100, status: 8 }, [['57', [{ id: 101, status: 8 }, { id: 102, status: 0 }]]]]
    const shown: any = showQueuedStages(list, actions)
    expect(shown[0]).toBe(list[0])
    expect(shown[1][0][1].map((order: any) => [order.id, order.status, order.delivery_position])).toEqual([[101, 3, undefined], [102, 8, 2]])
  })

  it('is the same list when the queue is empty or holds nothing for the orders (no new list on each render)', () => {
    const list = [{ id: 100, status: 8 }]
    expect(showQueuedStages(list, {})).toBe(list)
    expect(showQueuedStages(list, actions)[0]).toBe(list[0])
  })
})
