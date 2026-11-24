import React from 'react'
import { AppState } from 'react-native'
import { act, render } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNetInfo } from '@react-native-community/netinfo'

import { useApi, useEvent, useSession, useToast, useWebsocket } from '@components'
import { OfflineActionsProvider, useOfflineActions } from '..'

const QUEUE = 'offline_actions_array'
const SECOND = 1000

const change = (orderId: number, body: any = { status: 3 }, extra: any = {}) => ({
  event: 'evt_off_change_order_status',
  data: { orderId, body: { id: orderId, ...body } },
  ...extra
})
const stored = async () => JSON.parse((await AsyncStorage.getItem(QUEUE)) ?? 'null')
const seed = (queue: any) => AsyncStorage.setItem(QUEUE, JSON.stringify(queue))

let latest: any
const Probe = () => {
  latest = useOfflineActions()
  return null
}
const Tree = () => <OfflineActionsProvider><Probe /></OfflineActionsProvider>

/** What the API answers a request with: a script, one answer per request in the order they are made (the last repeats). */
type Answer = 'ok' | 'network' | { status: number, result?: any }
let save: jest.Mock
let concurrent = 0
let mostAtOnce = 0
const script = (...answers: Answer[]) => {
  let calls = 0
  save = jest.fn(async (orderId: string, body: any) => {
    const answer = answers[Math.min(calls, answers.length - 1)]
    calls += 1
    concurrent += 1
    mostAtOnce = Math.max(mostAtOnce, concurrent)
    try {
      if (answer === 'network') throw new Error('Network request failed')
      if (answer === 'ok') return { status: 200, content: { result: { id: body.id }, error: null } }
      return { status: answer.status, content: { result: answer.result ?? ['No'], error: true } }
    } finally {
      concurrent -= 1
    }
  })
}
const wire = (isConnected = true) => {
  ;(useNetInfo as jest.Mock).mockReturnValue({ isConnected })
  ;(useSession as jest.Mock).mockReturnValue([{ token: 'tkn' }, {}])
  ;(useWebsocket as jest.Mock).mockReturnValue({ getId: () => 'sid' })
  ;(useApi as jest.Mock).mockReturnValue([{
    root: 'https://api.test',
    appId: 'app',
    setAccessToken: () => ({ orders: (id: string) => ({ save: (body: any) => save(id, body) }) })
  }, {}])
}
const emit = jest.fn()
const toasts = () => (useToast as jest.Mock)()[1].showToast as jest.Mock
const emitted = () => emit.mock.calls.filter(([event]: any[]) => event === 'offline_order_updated')

const flush = () => act(async () => { await jest.advanceTimersByTimeAsync(0) })
const advance = (ms: number) => act(async () => { await jest.advanceTimersByTimeAsync(ms) })

/** The provider with the project's switch for saving changes on, and the queue already run once if there is a connection. */
const mount = async () => {
  const view = render(<Tree />)
  await act(async () => { latest[1].setState((state: any) => ({ ...state, canSaveChangesOffline: true })) })
  await flush()
  return view
}

describe('OfflineActionsProvider: the queue tries again by itself', () => {
  let foreground: ((state: string) => void) | undefined

  beforeEach(async () => {
    jest.useFakeTimers()
    await AsyncStorage.clear()
    emit.mockClear()
    toasts().mockClear()
    ;(useEvent as jest.Mock).mockReturnValue([{ emit, on: jest.fn(), off: jest.fn() }])
    global.fetch = jest.fn(async () => ({ json: async () => ({}) })) as any
    concurrent = 0
    mostAtOnce = 0
    foreground = undefined
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_type: string, handler: any) => {
      foreground = handler
      return { remove: jest.fn() }
    }) as any)
    script('ok')
    wire()
  })
  afterEach(() => {
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  describe('the schedule', () => {
    it('tries again after 15 s, 30 s and 1 min, then every 2 min', async () => {
      script('network')
      await seed({ 1: [change(1)] })
      await mount()
      expect(save).toHaveBeenCalledTimes(1)

      const expectNextAfter = async (ms: number, calls: number) => {
        await advance(ms - 1)
        expect(save).toHaveBeenCalledTimes(calls - 1)
        await advance(1)
        expect(save).toHaveBeenCalledTimes(calls)
      }
      await expectNextAfter(15 * SECOND, 2)
      await expectNextAfter(30 * SECOND, 3)
      await expectNextAfter(60 * SECOND, 4)
      await expectNextAfter(120 * SECOND, 5)
      await expectNextAfter(120 * SECOND, 6)
    })

    it('a transient failure (no answer, a 5xx, a 408, a 429) stays queued and the driver hears nothing', async () => {
      script('network', { status: 408 }, { status: 429 }, 'network')
      await seed({ 1: [change(1)] })
      await mount()
      await advance(15 * SECOND)
      await advance(30 * SECOND)
      await advance(60 * SECOND)
      expect(save).toHaveBeenCalledTimes(4)
      expect(toasts()).not.toHaveBeenCalled()
      expect(emitted()).toHaveLength(0)
      // Nothing was counted against the change: it is not refused, only not sent yet.
      expect((await stored())[1]).toEqual([change(1)])
    })

    it('stops when the queue empties, and no timer runs while it is empty', async () => {
      script('network', 'ok')
      await seed({ 1: [change(1)] })
      await mount()
      await advance(15 * SECOND)
      expect(save).toHaveBeenCalledTimes(2)
      expect(await stored()).toBeNull()
      expect(jest.getTimerCount()).toBe(0)
      await advance(10 * 60 * SECOND)
      expect(save).toHaveBeenCalledTimes(2)
    })

    it('an empty queue starts no timer at all', async () => {
      await mount()
      expect(save).not.toHaveBeenCalled()
      expect(jest.getTimerCount()).toBe(0)
    })

    it('stops when the connection goes', async () => {
      script('network')
      await seed({ 1: [change(1)] })
      const view = await mount()
      expect(jest.getTimerCount()).toBe(1)
      wire(false)
      view.rerender(<Tree />)
      await flush()
      expect(jest.getTimerCount()).toBe(0)
      await advance(10 * 60 * SECOND)
      expect(save).toHaveBeenCalledTimes(1)
    })

    it('starts again, from 15 s, when the connection comes back', async () => {
      script('network')
      await seed({ 1: [change(1)] })
      const view = await mount()
      await advance(15 * SECOND)
      await advance(30 * SECOND)
      expect(save).toHaveBeenCalledTimes(3)
      wire(false)
      view.rerender(<Tree />)
      await flush()
      wire(true)
      view.rerender(<Tree />)
      await flush()
      // The connection's own run, and then the sequence starts over: 15 s, not 1 min.
      expect(save).toHaveBeenCalledTimes(4)
      await advance(15 * SECOND)
      expect(save).toHaveBeenCalledTimes(5)
    })

    it('stops on unmount', async () => {
      script('network')
      await seed({ 1: [change(1)] })
      const view = await mount()
      expect(jest.getTimerCount()).toBe(1)
      view.unmount()
      expect(jest.getTimerCount()).toBe(0)
      await advance(10 * 60 * SECOND)
      expect(save).toHaveBeenCalledTimes(1)
    })

    it('stops on sign-out', async () => {
      script('network')
      await seed({ 1: [change(1)] })
      const view = await mount()
      expect(jest.getTimerCount()).toBe(1)
      ;(useSession as jest.Mock).mockReturnValue([{ token: null }, {}])
      view.rerender(<Tree />)
      await flush()
      expect(jest.getTimerCount()).toBe(0)
    })

    it('the app coming back to the foreground tries at once and starts the sequence over', async () => {
      script('network')
      await seed({ 1: [change(1)] })
      await mount()
      await advance(15 * SECOND)
      await advance(10 * SECOND)
      expect(save).toHaveBeenCalledTimes(2)
      await act(async () => { foreground!('active') })
      await flush()
      expect(save).toHaveBeenCalledTimes(3)
      // 15 s after that run, not the 30 s the old sequence was at.
      await advance(15 * SECOND)
      expect(save).toHaveBeenCalledTimes(4)
    })

    it('going to the background does nothing', async () => {
      script('network')
      await seed({ 1: [change(1)] })
      await mount()
      await act(async () => { foreground!('background') })
      await flush()
      expect(save).toHaveBeenCalledTimes(1)
    })
  })

  describe('one run at a time, and each change sent once', () => {
    it('a trigger while a run is on its way is not a second run in parallel', async () => {
      let finish!: () => void
      const gate = new Promise<void>((resolve) => { finish = resolve })
      script('ok')
      const inner = save
      save = jest.fn(async (id: string, body: any) => { await gate; return inner(id, body) })
      await seed({ 1: [change(1)], 2: [change(2)] })
      await mount()
      await act(async () => { foreground!('active') })
      await act(async () => { foreground!('active') })
      await flush()
      expect(save).toHaveBeenCalledTimes(1)
      await act(async () => { finish() })
      await flush()
      await flush()
      expect(mostAtOnce).toBe(1)
      expect(await stored()).toBeNull()
    })

    it('what a run sent is not sent again by the retry: only the order that did not go', async () => {
      script('ok', 'network', 'ok')
      await seed({ 1: [change(1)], 2: [change(2)] })
      await mount()
      expect(save.mock.calls.map(([id]: any[]) => id)).toEqual(['1', '2'])
      expect(Object.keys(await stored())).toEqual(['2'])
      await advance(15 * SECOND)
      expect(save.mock.calls.map(([id]: any[]) => id)).toEqual(['1', '2', '2'])
      expect(await stored()).toBeNull()
    })

    it('a change queued while a run goes is kept: the run writes on top of the storage, not over it', async () => {
      let finish!: () => void
      const gate = new Promise<void>((resolve) => { finish = resolve })
      script('ok')
      const inner = save
      save = jest.fn(async (id: string, body: any) => { await gate; return inner(id, body) })
      await seed({ 1: [change(1)] })
      await mount()
      await act(async () => { await latest[1].applyOffAction(change(3, { status: 8 })) })
      await act(async () => { finish() })
      await flush()
      expect(Object.keys(await stored())).toEqual(['3'])
    })
  })

  describe('a refusal (the API answered with a 4xx and its message)', () => {
    it('tells the driver once per run, with the order number and the API\'s message, and keeps the change, counted', async () => {
      script({ status: 400, result: ['Your location is outdated'] })
      await seed({ 1: [change(1)] })
      await mount()
      expect(toasts()).toHaveBeenCalledTimes(1)
      expect(toasts()).toHaveBeenCalledWith('error', 'The change to order No. 1 could not be sent: Your location is outdated')
      expect((await stored())[1]).toEqual([{ ...change(1), attempts: 1 }])
      expect(emitted()).toHaveLength(0)
    })

    it('several refused orders in one run are one toast: the first message and "and N more"', async () => {
      script({ status: 400, result: ['Your location is outdated'] })
      await seed({ 1: [change(1)], 2: [change(2)], 3: [change(3)] })
      await mount()
      expect(toasts()).toHaveBeenCalledTimes(1)
      expect(toasts()).toHaveBeenCalledWith('error', 'The change to order No. 1 could not be sent: Your location is outdated and 2 more')
    })

    it('is tried again on the schedule, and a refusal that passes on a later try clears the mark and the banner', async () => {
      script({ status: 400, result: ['Your location is outdated'] }, 'ok')
      await seed({ 1: [change(1)] })
      await mount()
      expect(Object.keys(latest[0].actions)).toEqual(['1'])
      await advance(15 * SECOND)
      expect(save).toHaveBeenCalledTimes(2)
      expect(latest[0].actions).toEqual({})
      expect(await stored()).toBeNull()
      // The orders list is told once, by the run that sent it.
      expect(emitted()).toEqual([['offline_order_updated', [1]]])
      expect(toasts()).toHaveBeenCalledTimes(1)
    })

    it('the third refusal drops the change, loads the order again and tells the driver it was not applied', async () => {
      script({ status: 400, result: ['Your location is outdated'] })
      await seed({ 1: [change(1)] })
      await mount()
      await advance(15 * SECOND)
      expect(save).toHaveBeenCalledTimes(2)
      expect(emitted()).toHaveLength(0)
      expect((await stored())[1][0].attempts).toBe(2)
      await advance(30 * SECOND)
      expect(save).toHaveBeenCalledTimes(3)
      // Dropped: out of the queue, the lists load again (the row shows the server's stage), and the driver is told.
      expect(await stored()).toBeNull()
      expect(latest[0].actions).toEqual({})
      expect(emitted()).toEqual([['offline_order_updated', [1]]])
      expect(toasts()).toHaveBeenLastCalledWith('error', 'The change to order No. 1 was not applied: Your location is outdated')
      expect(jest.getTimerCount()).toBe(0)
      await advance(10 * 60 * SECOND)
      expect(save).toHaveBeenCalledTimes(3)
    })

    it('a run that drops an order tells the drop (the news), once, with "and N more"', async () => {
      script({ status: 400, result: ['Not allowed'] })
      await seed({ 1: [change(1, { status: 3 }, { attempts: 2 })], 2: [change(2, { status: 3 }, { attempts: 2 })], 3: [change(3)] })
      await mount()
      expect(toasts()).toHaveBeenCalledTimes(1)
      expect(toasts()).toHaveBeenCalledWith('error', 'The change to order No. 1 was not applied: Not allowed and 1 more')
      // The third, refused for the first time, stays and is told in a later run.
      expect(Object.keys(await stored())).toEqual(['3'])
    })

    it('the count lives with the queued change: it survives the app being closed and opened again', async () => {
      script({ status: 400, result: ['Not allowed'] })
      await seed({ 1: [change(1)] })
      const first = await mount()
      expect((await stored())[1][0].attempts).toBe(1)
      first.unmount()

      render(<Tree />)
      await act(async () => { latest[1].setState((state: any) => ({ ...state, canSaveChangesOffline: true })) })
      await flush()
      expect((await stored())[1][0].attempts).toBe(2)
    })

    it('a 401 is not this path\'s: no word, not counted, not retried', async () => {
      script({ status: 401, result: ['Unauthorized'] })
      await seed({ 1: [change(1)] })
      await mount()
      expect(toasts()).not.toHaveBeenCalled()
      expect((await stored())[1]).toEqual([change(1)])
      expect(jest.getTimerCount()).toBe(0)
    })
  })

  describe('the earlier changes of an order, told to the business as a message', () => {
    const earlier = change(1, { status: 8 })

    it('are posted once, whatever the number of tries: the retry sends the last body again and not the message', async () => {
      script('network', 'network', 'ok')
      await seed({ 1: [earlier, change(1, { status: 3 })] })
      await mount()
      const posted = () => (global.fetch as jest.Mock).mock.calls.length
      expect(posted()).toBe(1)
      expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body).comment).toBe("id: '1', status: '8'")
      // What is told is remembered with the queued change.
      expect((await stored())[1][0].told).toBe(true)
      await advance(15 * SECOND)
      await advance(30 * SECOND)
      expect(save).toHaveBeenCalledTimes(3)
      expect(posted()).toBe(1)
      expect(save).toHaveBeenLastCalledWith('1', { id: 1, status: 3 })
    })

    it('are posted again only if the post itself did not go', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network request failed'))
      script('network')
      await seed({ 1: [earlier, change(1, { status: 3 })] })
      await mount()
      expect((await stored())[1][0].told).toBeUndefined()
      await advance(15 * SECOND)
      expect((global.fetch as jest.Mock).mock.calls.length).toBe(2)
      expect((await stored())[1][0].told).toBe(true)
    })

    it('a refused order does not post them again either', async () => {
      script({ status: 400, result: ['No'] })
      await seed({ 1: [earlier, change(1, { status: 3 })] })
      await mount()
      await advance(15 * SECOND)
      expect(save).toHaveBeenCalledTimes(2)
      expect((global.fetch as jest.Mock).mock.calls.length).toBe(1)
    })
  })
})
