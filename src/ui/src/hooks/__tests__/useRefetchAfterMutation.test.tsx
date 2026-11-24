import { act, renderHook } from '@testing-library/react-native'

import { useRefetchAfterMutation } from '../useRefetchAfterMutation'

/** A change a test settles when it chooses. */
const deferred = () => {
  let resolve: (value?: any) => void = () => {}
  let reject: (error?: any) => void = () => {}
  const promise = new Promise<any>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}

describe('useRefetchAfterMutation (a catch-up never races a change of the same screen)', () => {
  it('loads at once when nothing is on the way', () => {
    const refetch = jest.fn()
    const { result } = renderHook(() => useRefetchAfterMutation(refetch))
    act(() => result.current.catchUp())
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('waits for the change to end, then loads once however many catch-ups were asked', async () => {
    const refetch = jest.fn()
    const { result } = renderHook(() => useRefetchAfterMutation(refetch))
    const change = deferred()
    let done: Promise<any> = Promise.resolve()
    act(() => { done = result.current.track(() => change.promise) })
    expect(result.current.inFlight()).toBe(true)
    act(() => { result.current.catchUp(); result.current.catchUp() })
    expect(refetch).not.toHaveBeenCalled()
    await act(async () => { change.resolve('ok'); await done })
    expect(refetch).toHaveBeenCalledTimes(1)
    expect(result.current.inFlight()).toBe(false)
  })

  it('loads nothing when no catch-up was asked, and returns what the change returned', async () => {
    const refetch = jest.fn()
    const { result } = renderHook(() => useRefetchAfterMutation(refetch))
    let value: any
    await act(async () => { value = await result.current.track(async () => 42) })
    expect(value).toBe(42)
    expect(refetch).not.toHaveBeenCalled()
  })

  it('a change that throws still ends: the in-flight mark clears, the waiting catch-up loads and the error goes on', async () => {
    const refetch = jest.fn()
    const { result } = renderHook(() => useRefetchAfterMutation(refetch))
    const change = deferred()
    let outcome: Promise<any> = Promise.resolve()
    act(() => { outcome = result.current.track(() => change.promise).catch((error) => error.message) })
    act(() => result.current.catchUp())
    await act(async () => { change.reject(new Error('offline')); expect(await outcome).toBe('offline') })
    expect(result.current.inFlight()).toBe(false)
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('a change that the controller runs on its own (busy) holds a catch-up the same way, until it is over', () => {
    const refetch = jest.fn()
    const { result, rerender } = renderHook(({ busy }: { busy: boolean }) => useRefetchAfterMutation(refetch, busy), { initialProps: { busy: true } })
    act(() => result.current.catchUp())
    expect(refetch).not.toHaveBeenCalled()
    rerender({ busy: false })
    expect(refetch).toHaveBeenCalledTimes(1)
    rerender({ busy: true })
    rerender({ busy: false })
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
