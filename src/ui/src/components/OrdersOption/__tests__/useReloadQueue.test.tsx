import { act, renderHook } from '@testing-library/react-native'

import { RELOAD_GIVE_UP_MS, useReloadQueue } from '../useReloadQueue'

/** A load that ends when the test says so. */
const load = () => {
  let finish!: () => void
  const run = jest.fn(() => new Promise<void>((resolve) => { finish = resolve }))
  return { run, finish: () => finish() }
}

describe('useReloadQueue', () => {
  it('starts a reload at once when nothing is in the way', () => {
    const { result } = renderHook(() => useReloadQueue())
    const first = load()
    act(() => { result.current.request('orders', first.run) })
    expect(first.run).toHaveBeenCalledTimes(1)
  })

  it('runs one reload per list at a time, and the reloads asked meanwhile run once, the last asked, after it', async () => {
    const { result } = renderHook(() => useReloadQueue())
    const first = load()
    const second = load()
    const third = load()
    act(() => { result.current.request('orders', first.run) })
    act(() => { result.current.request('orders', second.run) })
    act(() => { result.current.request('orders', third.run) })
    expect(first.run).toHaveBeenCalledTimes(1)
    expect(second.run).not.toHaveBeenCalled()
    await act(async () => { first.finish() })
    expect(second.run).not.toHaveBeenCalled()
    expect(third.run).toHaveBeenCalledTimes(1)
    await act(async () => { third.finish() })
    // Nothing is asked again by itself.
    expect(first.run).toHaveBeenCalledTimes(1)
    expect(third.run).toHaveBeenCalledTimes(1)
  })

  it('keeps the lists apart: one list loading does not hold another', () => {
    const { result } = renderHook(() => useReloadQueue())
    const orders = load()
    const requests = load()
    act(() => { result.current.request('orders', orders.run) })
    act(() => { result.current.request('requests', requests.run) })
    expect(orders.run).toHaveBeenCalledTimes(1)
    expect(requests.run).toHaveBeenCalledTimes(1)
  })

  it('does not start while a change of the driver\'s own is on its way, and runs once when the last one ends', async () => {
    const { result } = renderHook(() => useReloadQueue())
    let endFirst!: () => void
    let endSecond!: () => void
    let tracked!: Promise<any>
    act(() => {
      tracked = result.current.track(() => new Promise<void>((resolve) => { endFirst = resolve }))
      result.current.track(() => new Promise<void>((resolve) => { endSecond = resolve }))
    })
    const reload = load()
    act(() => { result.current.request('orders', reload.run) })
    act(() => { result.current.request('orders', reload.run) })
    expect(reload.run).not.toHaveBeenCalled()
    await act(async () => { endFirst(); await tracked })
    // One change is still on its way.
    expect(reload.run).not.toHaveBeenCalled()
    await act(async () => { endSecond() })
    expect(reload.run).toHaveBeenCalledTimes(1)
  })

  it('answers what the change answered, and frees the reloads when it fails', async () => {
    const { result } = renderHook(() => useReloadQueue())
    let answer: any
    await act(async () => { answer = await result.current.track(async () => 'done') })
    expect(answer).toBe('done')
    await act(async () => { await result.current.track(async () => { throw new Error('boom') }).catch(() => {}) })
    const reload = load()
    act(() => { result.current.request('orders', reload.run) })
    expect(reload.run).toHaveBeenCalledTimes(1)
  })

  it('goes on after a reload that failed', async () => {
    const { result } = renderHook(() => useReloadQueue())
    const next = load()
    act(() => { result.current.request('orders', () => Promise.reject(new Error('offline'))) })
    await act(async () => {})
    act(() => { result.current.request('orders', next.run) })
    expect(next.run).toHaveBeenCalledTimes(1)
  })

  it('does not hold the list for ever behind a reload that never answers', async () => {
    jest.useFakeTimers()
    try {
      const { result } = renderHook(() => useReloadQueue())
      const hung = load()
      const next = load()
      act(() => { result.current.request('orders', hung.run) })
      act(() => { result.current.request('orders', next.run) })
      expect(next.run).not.toHaveBeenCalled()
      await act(async () => { jest.advanceTimersByTime(RELOAD_GIVE_UP_MS + 1) })
      expect(next.run).toHaveBeenCalledTimes(1)
    } finally {
      jest.useRealTimers()
    }
  })
})
