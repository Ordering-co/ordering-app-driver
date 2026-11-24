import React from 'react'
import { act, render, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNetInfo } from '@react-native-community/netinfo'

import { useApi, useConfig, useEvent } from '@components'
import { OfflineActionsProvider, projectCombinesTabs, projectSavesChangesOffline, useOfflineActions } from '..'

const QUEUE = 'offline_actions_array'

const change = (orderId: number, body: any = { status: 9 }) => ({
  event: 'evt_off_change_order_status',
  data: { orderId, body: { id: orderId, ...body } }
})
const stored = async () => JSON.parse((await AsyncStorage.getItem(QUEUE)) ?? 'null')

// What the screens hold: the context as of the render they were drawn in (`apply` is the function of that first render).
let latest: any
const Probe = () => {
  latest = useOfflineActions()
  return null
}

/** The provider drawn offline with the project's switch for saving changes on. */
const mount = async () => {
  const view = render(<OfflineActionsProvider><Probe /></OfflineActionsProvider>)
  await act(async () => { latest[1].setState((state: any) => ({ ...state, canSaveChangesOffline: true })) })
  return view
}

describe('OfflineActionsProvider: the queue of changes made without a connection', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    ;(useNetInfo as jest.Mock).mockReturnValue({ isConnected: false })
  })

  it('keeps every change of calls that come in a row from the same render (a group is one call per order)', async () => {
    await mount()
    // Three calls of the first render's function: none of them sees the others in the `state` that render holds.
    const [, { applyOffAction }] = latest
    await act(async () => {
      await applyOffAction(change(1))
      await applyOffAction(change(2))
      await applyOffAction(change(3))
    })
    expect(Object.keys(await stored())).toEqual(['1', '2', '3'])
    expect(Object.keys(latest[0].actions)).toEqual(['1', '2', '3'])
  })

  it('keeps them too when the calls are made together, without waiting for each other', async () => {
    await mount()
    const [, { applyOffAction }] = latest
    await act(async () => { await Promise.all([applyOffAction(change(1)), applyOffAction(change(2)), applyOffAction(change(3))]) })
    expect(Object.keys(await stored())).toEqual(['1', '2', '3'])
    expect(Object.keys(latest[0].actions)).toEqual(['1', '2', '3'])
  })

  it('writes a list of changes (a group) together, and adds a second change of one order to the list of that order', async () => {
    await mount()
    const [, { applyOffAction }] = latest
    await act(async () => { await applyOffAction([change(1), change(2)]) })
    await act(async () => { await applyOffAction(change(1, { status: 11 })) })
    const queue = await stored()
    expect(Object.keys(queue)).toEqual(['1', '2'])
    expect(queue['1'].map((item: any) => item.data.body.status)).toEqual([9, 11])
    expect(queue['2']).toHaveLength(1)
  })

  it('goes on after a write that failed: the next change is still queued, on what the storage holds', async () => {
    await mount()
    const [, { applyOffAction }] = latest
    ;(AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'))
    await act(async () => { await applyOffAction(change(1)) })
    await act(async () => { await applyOffAction(change(2)) })
    // The storage helper swallows the failure, so the queue holds what was written after it.
    expect(Object.keys(await stored())).toEqual(['2'])
  })

  it('builds on what the storage already holds (the queue of an earlier run), not on a state that does not know it yet', async () => {
    await AsyncStorage.setItem(QUEUE, JSON.stringify({ 9: [change(9)] }))
    await mount()
    const [, { applyOffAction }] = latest
    await act(async () => { await applyOffAction(change(1)) })
    expect(Object.keys(await stored()).sort()).toEqual(['1', '9'])
  })

  it('queues nothing when the project does not allow saving changes offline', async () => {
    render(<OfflineActionsProvider><Probe /></OfflineActionsProvider>)
    let answer: any
    await act(async () => { answer = await latest[1].applyOffAction(change(1)) })
    expect(answer).toBe(false)
    expect(await stored()).toBeNull()
  })

  it('replays a group queued as one change per order: one request for each order, the queue emptied, the list told', async () => {
    const save = jest.fn(async (body: any) => ({ content: { result: { id: body.id }, error: null } }))
    const orders = jest.fn(() => ({ save }))
    const emit = jest.fn()
    ;(useApi as jest.Mock).mockReturnValue([{ setAccessToken: () => ({ orders }) }, {}])
    ;(useEvent as jest.Mock).mockReturnValue([{ emit, on: jest.fn(), off: jest.fn() }])

    const view = await mount()
    await act(async () => { await latest[1].applyOffAction([change(1), change(2), change(3)]) })
    expect(save).not.toHaveBeenCalled()

    // The connection returns.
    ;(useNetInfo as jest.Mock).mockReturnValue({ isConnected: true })
    view.rerender(<OfflineActionsProvider><Probe /></OfflineActionsProvider>)
    await waitFor(() => expect(save).toHaveBeenCalledTimes(3))
    expect(orders.mock.calls.map(([id]: any) => id)).toEqual(['1', '2', '3'])
    expect(save.mock.calls.map(([body]: any) => body)).toEqual([
      { id: 1, status: 9 }, { id: 2, status: 9 }, { id: 3, status: 9 }
    ])
    await waitFor(() => expect(emit).toHaveBeenCalledWith('offline_order_updated', [1, 2, 3]))
    await waitFor(async () => expect(await stored()).toBeNull())
  })

  it('keeps the orders of the group that did not sync, for the next connection', async () => {
    const save = jest.fn(async (body: any) => (body.id === 2
      ? { content: { result: 'No', error: true } }
      : { content: { result: { id: body.id }, error: null } }))
    ;(useApi as jest.Mock).mockReturnValue([{ setAccessToken: () => ({ orders: () => ({ save }) }) }, {}])
    ;(useEvent as jest.Mock).mockReturnValue([{ emit: jest.fn(), on: jest.fn(), off: jest.fn() }])

    const view = await mount()
    await act(async () => { await latest[1].applyOffAction([change(1), change(2), change(3)]) })
    ;(useNetInfo as jest.Mock).mockReturnValue({ isConnected: true })
    view.rerender(<OfflineActionsProvider><Probe /></OfflineActionsProvider>)
    await waitFor(() => expect(save).toHaveBeenCalledTimes(3))
    await waitFor(async () => expect(Object.keys((await stored()) ?? {})).toEqual(['2']))
  })

  describe('what the lists are told when a run of the queue ends (the orders list loads again on it)', () => {
    const connect = (view: any) => {
      ;(useNetInfo as jest.Mock).mockReturnValue({ isConnected: true })
      view.rerender(<OfflineActionsProvider><Probe /></OfflineActionsProvider>)
    }
    const told = (emit: jest.Mock) => emit.mock.calls.filter(([event]: any[]) => event === 'offline_order_updated')

    it('tells once per run, after the last request of the run has answered, never before', async () => {
      const answers: Array<(value: any) => void> = []
      const save = jest.fn((body: any) => new Promise((resolve) => { answers.push(() => resolve({ content: { result: { id: body.id }, error: null } })) }))
      const emit = jest.fn()
      ;(useApi as jest.Mock).mockReturnValue([{ setAccessToken: () => ({ orders: () => ({ save }) }) }, {}])
      ;(useEvent as jest.Mock).mockReturnValue([{ emit, on: jest.fn(), off: jest.fn() }])

      const view = await mount()
      await act(async () => { await latest[1].applyOffAction([change(1), change(2), change(3)]) })
      connect(view)
      // The run replays order by order: the request of the next waits for the answer of the one before.
      await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
      expect(told(emit)).toHaveLength(0)
      await act(async () => { answers[0](undefined) })
      await waitFor(() => expect(save).toHaveBeenCalledTimes(2))
      expect(told(emit)).toHaveLength(0)
      await act(async () => { answers[1](undefined) })
      await waitFor(() => expect(save).toHaveBeenCalledTimes(3))
      expect(told(emit)).toHaveLength(0)
      await act(async () => { answers[2](undefined) })
      await waitFor(() => expect(told(emit)).toHaveLength(1))
      // One announcement for the run, carrying every order that took.
      expect(told(emit)[0]).toEqual(['offline_order_updated', [1, 2, 3]])
    })

    it('says it is sending while the run\'s requests are out (the lists hold their loads), and has stopped when it tells them', async () => {
      const answers: Array<() => void> = []
      const save = jest.fn((body: any) => new Promise((resolve) => { answers.push(() => resolve({ content: { result: { id: body.id }, error: null } })) }))
      let syncingWhenTold: any
      const emit = jest.fn((event: string) => { if (event === 'offline_order_updated') syncingWhenTold = latest[0].syncing })
      ;(useApi as jest.Mock).mockReturnValue([{ setAccessToken: () => ({ orders: () => ({ save }) }) }, {}])
      ;(useEvent as jest.Mock).mockReturnValue([{ emit, on: jest.fn(), off: jest.fn() }])

      const view = await mount()
      expect(latest[0].syncing).toBe(false)
      await act(async () => { await latest[1].applyOffAction([change(1)]) })
      connect(view)
      await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
      expect(latest[0].syncing).toBe(true)
      await act(async () => { answers[0]() })
      await waitFor(() => expect(told(emit)).toHaveLength(1))
      // The announcement comes while the run still holds the lists (it is the screens' reload that waits for the end), then it ends.
      expect(syncingWhenTold).toBe(true)
      await waitFor(() => expect(latest[0].syncing).toBe(false))
    })

    it('does not say it is sending for a run with nothing queued', async () => {
      ;(useApi as jest.Mock).mockReturnValue([{ setAccessToken: () => ({ orders: () => ({ save: jest.fn() }) }) }, {}])
      ;(useEvent as jest.Mock).mockReturnValue([{ emit: jest.fn(), on: jest.fn(), off: jest.fn() }])
      const view = await mount()
      connect(view)
      await act(async () => {})
      expect(latest[0].syncing).toBe(false)
    })

    it('a request that never answers is a failed one after a while: the run ends, the change stays queued, and the lists are let go', async () => {
      jest.useFakeTimers()
      try {
        const save = jest.fn(() => new Promise(() => {}))
        const emit = jest.fn()
        ;(useApi as jest.Mock).mockReturnValue([{ setAccessToken: () => ({ orders: () => ({ save }) }) }, {}])
        ;(useEvent as jest.Mock).mockReturnValue([{ emit, on: jest.fn(), off: jest.fn() }])
        const view = await mount()
        await act(async () => { await latest[1].applyOffAction([change(1)]) })
        connect(view)
        await act(async () => { await Promise.resolve() })
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
        expect(latest[0].syncing).toBe(true)
        await act(async () => { jest.advanceTimersByTime(31000) })
        await waitFor(() => expect(latest[0].syncing).toBe(false))
        expect(told(emit)).toHaveLength(0)
        expect(Object.keys((await stored()) ?? {})).toEqual(['1'])
      } finally {
        jest.useRealTimers()
      }
    })

    it('tells only the orders that took, and nothing when every change failed', async () => {
      const failing = jest.fn(async () => ({ content: { result: ['No'], error: true } }))
      const emit = jest.fn()
      ;(useApi as jest.Mock).mockReturnValue([{ setAccessToken: () => ({ orders: () => ({ save: failing }) }) }, {}])
      ;(useEvent as jest.Mock).mockReturnValue([{ emit, on: jest.fn(), off: jest.fn() }])

      const view = await mount()
      await act(async () => { await latest[1].applyOffAction([change(1), change(2)]) })
      connect(view)
      await waitFor(() => expect(failing).toHaveBeenCalledTimes(2))
      await act(async () => {})
      expect(told(emit)).toHaveLength(0)
      // What did not sync stays queued for the next connection.
      expect(Object.keys((await stored()) ?? {})).toEqual(['1', '2'])
    })

    it('forgets the offline copies of the orders when the connection returns (the next stretch offline starts from what the lists held then)', async () => {
      const view = await mount()
      await act(async () => { await latest[1].registerOffOrder({ id: 7, status: 8, oldStatus: 4, unsync: true }) })
      expect(latest[0].orders).not.toBeNull()
      connect(view)
      await waitFor(() => expect(latest[0].orders).toBeNull())
    })

    describe('registering an order for the offline list', () => {
      const listOf = async (status: string) => JSON.parse((await AsyncStorage.getItem(`${status}_orders`)) ?? 'null')

      it('takes the order out of the list it was in (a group as the list holds it, too) and puts it in the list of its new status', async () => {
        await AsyncStorage.setItem('pending_orders', JSON.stringify([{ id: 1, status: 0 }, { id: 2, status: 0 }]))
        await AsyncStorage.setItem('inProgress_orders', JSON.stringify([[['57', [{ id: 5, status: 8 }, { id: 6, status: 8 }]]]]))
        await mount()
        await act(async () => { await latest[1].registerOffOrder({ id: 1, status: 8, oldStatus: 0, unsync: true }) })
        await act(async () => { await latest[1].registerOffOrder({ id: 5, status: 3, oldStatus: 8, unsync: true }) })
        expect((await listOf('pending')).map((order: any) => order.id)).toEqual([2])
        // The order that was inside the group is one plain order now, once, with its new status.
        expect((await listOf('inProgress')).map((order: any) => [order.id, order.status])).toEqual([[6, 8], [5, 3], [1, 8]])
      })

      it('a second change of the same order leaves no copy behind: one order, the last status', async () => {
        await AsyncStorage.setItem('inProgress_orders', JSON.stringify([{ id: 1, status: 4 }]))
        await mount()
        await act(async () => { await latest[1].registerOffOrder({ id: 1, status: 8, oldStatus: 4, unsync: true }) })
        await act(async () => { await latest[1].registerOffOrder({ id: 1, status: 3, oldStatus: 4, unsync: true }) })
        expect(await listOf('inProgress')).toEqual([{ id: 1, status: 3, oldStatus: 4, unsync: true }])
      })

      it('a group registered one order after another keeps every order', async () => {
        await AsyncStorage.setItem('inProgress_orders', JSON.stringify([{ id: 1, status: 8 }, { id: 2, status: 8 }]))
        await mount()
        await act(async () => {
          await Promise.all([
            latest[1].registerOffOrder({ id: 1, status: 3, oldStatus: 8, unsync: true }),
            latest[1].registerOffOrder({ id: 2, status: 3, oldStatus: 8, unsync: true })
          ])
        })
        expect((await listOf('inProgress')).map((order: any) => [order.id, order.status])).toEqual([[2, 3], [1, 3]])
      })
    })

    it('sends the delivery position of an earlier change with the last one (the accept\'s, then a step), and only the last body', async () => {
      const save = jest.fn(async (body: any) => ({ content: { result: { id: body.id }, error: null } }))
      ;(useApi as jest.Mock).mockReturnValue([{ setAccessToken: () => ({ orders: () => ({ save }) }), root: 'https://api.test', appId: 'x' }, {}])
      ;(useEvent as jest.Mock).mockReturnValue([{ emit: jest.fn(), on: jest.fn(), off: jest.fn() }])
      global.fetch = jest.fn(async () => ({ json: async () => ({}) })) as any

      const view = await mount()
      await act(async () => { await latest[1].applyOffAction(change(1, { status: 8, delivered_in: 30, delivery_position: 2 })) })
      await act(async () => { await latest[1].applyOffAction(change(1, { status: 3 })) })
      connect(view)
      await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
      expect(save).toHaveBeenCalledWith({ id: 1, status: 3, delivery_position: 2 })
    })
  })
})

describe('OfflineActionsProvider: whether the project keeps changes made offline follows its loaded config', () => {
  const configOf = (configs: any, loading = false) => (useConfig as jest.Mock).mockReturnValue([{ loading, configs }])
  const loaded = (value?: string) => ({ default_order_type: { value: 'delivery' }, ...(value === undefined ? {} : { allow_save_changes_offline: { key: 'allow_save_changes_offline', value } }) })
  const KEY = 'allow_save_changes_offline'
  const canSave = () => latest[0].canSaveChangesOffline

  beforeEach(async () => {
    await AsyncStorage.clear()
    ;(useNetInfo as jest.Mock).mockReturnValue({ isConnected: false })
    configOf({})
  })

  describe('what a config says', () => {
    it('is on for "1" (as a text or a number) and off for any other value', () => {
      expect(projectSavesChangesOffline({ configs: loaded('1') })).toBe(true)
      expect(projectSavesChangesOffline({ configs: { allow_save_changes_offline: { value: 1 } } })).toBe(true)
      expect(projectSavesChangesOffline({ configs: loaded('0') })).toBe(false)
      expect(projectSavesChangesOffline({ configs: { allow_save_changes_offline: { value: null } } })).toBe(false)
    })

    it('is off for a config that has loaded without the key (a project that does not set it does not keep changes)', () => {
      expect(projectSavesChangesOffline({ loading: false, configs: loaded() })).toBe(false)
    })

    it('is not known while the config has not loaded: loading, or empty (its request failed, or the app opened offline)', () => {
      expect(projectSavesChangesOffline({ loading: true, configs: {} })).toBeUndefined()
      expect(projectSavesChangesOffline({ loading: false, configs: {} })).toBeUndefined()
      expect(projectSavesChangesOffline({ loading: true, configs: loaded() })).toBeUndefined()
      expect(projectSavesChangesOffline(undefined)).toBeUndefined()
    })
  })

  it('is off, never on, until something says otherwise', () => {
    render(<OfflineActionsProvider><Probe /></OfflineActionsProvider>)
    expect(canSave()).toBe(false)
  })

  it('takes the loaded config\'s value, and writes it down for an app that opens with no connection', async () => {
    configOf(loaded('1'))
    render(<OfflineActionsProvider><Probe /></OfflineActionsProvider>)
    await waitFor(() => expect(canSave()).toBe(true))
    expect(await AsyncStorage.getItem(KEY)).toBe('true')
  })

  it('follows the config as it changes: a config that arrives after the screens, and one the project changes later', async () => {
    const view = render(<OfflineActionsProvider><Probe /></OfflineActionsProvider>)
    expect(canSave()).toBe(false)
    configOf(loaded('1'))
    view.rerender(<OfflineActionsProvider><Probe /></OfflineActionsProvider>)
    await waitFor(() => expect(canSave()).toBe(true))
    configOf(loaded('0'))
    view.rerender(<OfflineActionsProvider><Probe /></OfflineActionsProvider>)
    await waitFor(() => expect(canSave()).toBe(false))
    expect(await AsyncStorage.getItem(KEY)).toBe('false')
  })

  it('a value an earlier run kept stands in while the config is not known, and never outlives the loaded one', async () => {
    await AsyncStorage.setItem(KEY, 'true')
    const view = render(<OfflineActionsProvider><Probe /></OfflineActionsProvider>)
    // The config has not loaded (the app opened offline): what the last run knew.
    await waitFor(() => expect(canSave()).toBe(true))
    // The config loads and says the project does not keep changes: the kept value is gone, and stays gone.
    configOf(loaded('0'))
    view.rerender(<OfflineActionsProvider><Probe /></OfflineActionsProvider>)
    await waitFor(() => expect(canSave()).toBe(false))
    expect(await AsyncStorage.getItem(KEY)).toBe('false')
  })

  it('a kept value that is read after the config loaded does not take the config\'s place', async () => {
    let release: () => void = () => {}
    // The first read (the kept value) is slow: it comes back after the config has loaded, with what an earlier run kept.
    ;(AsyncStorage.getItem as jest.Mock).mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => { release = resolve })
      return 'true'
    })
    configOf(loaded('0'))
    render(<OfflineActionsProvider><Probe /></OfflineActionsProvider>)
    await act(async () => { release() })
    expect(canSave()).toBe(false)
  })

  it('ignores a kept value that is not a boolean (what an older version may have left)', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify('1'))
    render(<OfflineActionsProvider><Probe /></OfflineActionsProvider>)
    await act(async () => {})
    expect(canSave()).toBe(false)
  })

  it('the queue follows it: a project that does not keep changes queues nothing, one that does queues', async () => {
    configOf(loaded('0'))
    const off = render(<OfflineActionsProvider><Probe /></OfflineActionsProvider>)
    await act(async () => {})
    let queued: any
    await act(async () => { queued = await latest[1].applyOffAction(change(1)) })
    expect(queued).toBe(false)
    expect(await stored()).toBeNull()
    off.unmount()
    configOf(loaded('1'))
    render(<OfflineActionsProvider><Probe /></OfflineActionsProvider>)
    await waitFor(() => expect(canSave()).toBe(true))
    await act(async () => { await latest[1].applyOffAction(change(1)) })
    expect(Object.keys(await stored())).toEqual(['1'])
  })
})

describe('OfflineActionsProvider: whether the project shows three tabs or four follows its loaded config', () => {
  const KEY = 'combine_pending_and_progress_orders'
  const configOf = (configs: any, loading = false) => (useConfig as jest.Mock).mockReturnValue([{ loading, configs }])
  const loaded = (value?: string) => ({ default_order_type: { value: 'delivery' }, ...(value === undefined ? {} : { [KEY]: { key: KEY, value } }) })
  const combined = () => latest[0].isCombinedTabs
  const read = () => latest[0].combinedTabsRead
  const mountProvider = () => render(<OfflineActionsProvider><Probe /></OfflineActionsProvider>)
  const remount = (view: any) => view.rerender(<OfflineActionsProvider><Probe /></OfflineActionsProvider>)

  beforeEach(async () => {
    await AsyncStorage.clear()
    ;(useNetInfo as jest.Mock).mockReturnValue({ isConnected: false })
    configOf({})
  })

  describe('what a config says', () => {
    it('is on for "1" (as a text or a number) and off for any other value', () => {
      expect(projectCombinesTabs({ configs: loaded('1') })).toBe(true)
      expect(projectCombinesTabs({ configs: { [KEY]: { value: 1 } } })).toBe(true)
      expect(projectCombinesTabs({ configs: loaded('0') })).toBe(false)
      expect(projectCombinesTabs({ configs: { [KEY]: { value: null } } })).toBe(false)
    })

    it('is off for a config that has loaded without the key (the project does not combine its tabs)', () => {
      expect(projectCombinesTabs({ loading: false, configs: loaded() })).toBe(false)
    })

    it('is not known while the config has not loaded: loading, or empty (its request failed, or the app opened offline)', () => {
      expect(projectCombinesTabs({ loading: true, configs: {} })).toBeUndefined()
      expect(projectCombinesTabs({ loading: false, configs: {} })).toBeUndefined()
      expect(projectCombinesTabs({ loading: true, configs: loaded() })).toBeUndefined()
      expect(projectCombinesTabs(undefined)).toBeUndefined()
    })
  })

  it('is not known, and not read, until something says: no value is made up', () => {
    mountProvider()
    expect(combined()).toBeNull()
    expect(read()).toBe(false)
  })

  it('takes the loaded config\'s value in the first render when the config is already there, and writes it down for a cold start offline', async () => {
    configOf(loaded('1'))
    mountProvider()
    expect(combined()).toBe(true)
    expect(read()).toBe(true)
    await waitFor(async () => expect(await AsyncStorage.getItem(KEY)).toBe('true'))
  })

  it('writes the value of each config that loads, as the project changes it', async () => {
    const view = mountProvider()
    configOf(loaded('1'))
    remount(view)
    await waitFor(() => expect(combined()).toBe(true))
    expect(await AsyncStorage.getItem(KEY)).toBe('true')
    configOf(loaded('0'))
    remount(view)
    await waitFor(() => expect(combined()).toBe(false))
    expect(await AsyncStorage.getItem(KEY)).toBe('false')
  })

  it('writes nothing while the config is not known (a kept value is not written over by a guess)', async () => {
    await AsyncStorage.setItem(KEY, 'true')
    const setItem = AsyncStorage.setItem as jest.Mock
    setItem.mockClear()
    mountProvider()
    await act(async () => {})
    expect(setItem.mock.calls.filter((call) => call[0] === KEY)).toHaveLength(0)
  })

  it('a value an earlier run kept stands in while the config is not known, and the screens may read it as known', async () => {
    await AsyncStorage.setItem(KEY, 'true')
    mountProvider()
    await waitFor(() => expect(combined()).toBe(true))
    expect(read()).toBe(true)
  })

  it('says it has read nothing kept when nothing is (so a screen knows there is no value to wait for)', async () => {
    mountProvider()
    await waitFor(() => expect(read()).toBe(true))
    expect(combined()).toBeNull()
  })

  it('a kept value never outlives the loaded config', async () => {
    await AsyncStorage.setItem(KEY, 'true')
    const view = mountProvider()
    await waitFor(() => expect(combined()).toBe(true))
    configOf(loaded('0'))
    remount(view)
    await waitFor(() => expect(combined()).toBe(false))
    expect(await AsyncStorage.getItem(KEY)).toBe('false')
  })

  it('a kept value that is read after the config loaded does not take the config\'s place', async () => {
    let release: () => void = () => {}
    // The first read is the offline switch's; the second one, this switch's, is slow: it comes back after the config has loaded.
    ;(AsyncStorage.getItem as jest.Mock)
      .mockImplementationOnce(async () => null)
      .mockImplementationOnce(async () => {
        await new Promise<void>((resolve) => { release = resolve })
        return 'true'
      })
    configOf(loaded('0'))
    mountProvider()
    await act(async () => { release() })
    expect(combined()).toBe(false)
    expect(read()).toBe(true)
  })

  it('ignores a kept value that is not a boolean (what an older version may have left)', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify('1'))
    mountProvider()
    await waitFor(() => expect(read()).toBe(true))
    expect(combined()).toBeNull()
  })
})
