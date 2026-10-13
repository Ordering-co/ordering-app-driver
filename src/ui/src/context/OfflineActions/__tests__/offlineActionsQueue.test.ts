import {
  getOfflineActionsAfterReplay,
  parseStoredOfflineActions
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
