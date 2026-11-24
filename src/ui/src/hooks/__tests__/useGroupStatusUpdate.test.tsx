import { act, renderHook } from '@testing-library/react-native'

import { useGroupStatusUpdate } from '../useGroupStatusUpdate'

/** The hook with the request and the ids of a screen; `onSucceeded` is what the screen does when every order changed. */
const setup = (handleChangeOrderStatus: any, ids = [7, 8]) => {
  const onSucceeded = jest.fn()
  const view = renderHook((props: any) => useGroupStatusUpdate(props), { initialProps: { ids, handleChangeOrderStatus, onSucceeded } })
  return { ...view, onSucceeded }
}

const ok = (id: number) => ({ id, result: { id }, error: false })
const refused = (id: number, message: any) => ({ id, result: message, error: true })

describe('useGroupStatusUpdate', () => {
  it('success: every order changed, the screen is told once and there is no error', async () => {
    const request = jest.fn().mockResolvedValue([{}, {}])
    const { result, onSucceeded } = setup(request)
    let answer: any
    await act(async () => { answer = await result.current.update(8, { status: 8 }) })
    expect(answer).toBe(true)
    expect(request).toHaveBeenCalledWith(8, [7, 8], { status: 8 }, { withDetails: true })
    expect(onSucceeded).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBeUndefined()
  })

  it('null results (the delivery time did not save): not changed, the screen stays and a plain sentence says so', async () => {
    const request = jest.fn().mockResolvedValue([null, null])
    const { result, onSucceeded } = setup(request)
    let answer: any
    await act(async () => { answer = await result.current.update(8, { delivered_in: 20 }) })
    expect(answer).toBe(false)
    expect(onSucceeded).not.toHaveBeenCalled()
    // No message came with the failure: never "undefined" or a code.
    expect(result.current.error).toBe('The change was not saved. Try again.')
  })

  it('a request that throws is not changed either: its message is the error and the next tap tries again', async () => {
    const request = jest.fn().mockRejectedValueOnce(new Error('Network request failed')).mockResolvedValueOnce([{}, {}])
    const { result, onSucceeded } = setup(request)
    await act(async () => { expect(await result.current.update(8, {})).toBe(false) })
    expect(result.current.error).toBe('Network request failed')
    expect(onSucceeded).not.toHaveBeenCalled()
    await act(async () => { expect(await result.current.update(8, {})).toBe(true) })
    expect(onSucceeded).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBeUndefined()
    // Every order again: none had changed.
    expect(request.mock.calls[1][1]).toEqual([7, 8])
  })

  it('the API\'s message is worded and never a code', async () => {
    const request = jest.fn().mockResolvedValue([refused(7, ['ERROR_ORDER_FIND'])])
    const { result } = setup(request, [7])
    await act(async () => { await result.current.update(8, {}) })
    expect(result.current.error).toBe('Order not found')
  })

  it('a single order that failed says why, with no count', async () => {
    const request = jest.fn().mockResolvedValue([refused(7, ['The order is closed'])])
    const { result } = setup(request, [7])
    await act(async () => { await result.current.update(8, {}) })
    expect(result.current.error).toBe('The order is closed')
  })

  it('a whole group that failed says why, with no count', async () => {
    const request = jest.fn().mockResolvedValue([refused(7, ['Business closed']), refused(8, ['Business closed'])])
    const { result } = setup(request)
    await act(async () => { await result.current.update(8, {}) })
    expect(result.current.error).toBe('Business closed')
  })

  it('partial failure: stays, says how many did not change and why, and the retry sends only those', async () => {
    const request = jest.fn()
      .mockResolvedValueOnce([ok(7), refused(8, ['Order not found'])])
      .mockResolvedValueOnce([ok(8)])
    const { result, onSucceeded } = setup(request, [7, 8])
    await act(async () => { expect(await result.current.update(8, { delivered_in: 20 })).toBe(false) })
    expect(result.current.error).toBe('Orders that did not change: 1 · Order not found')
    expect(onSucceeded).not.toHaveBeenCalled()

    await act(async () => { expect(await result.current.update(8, { delivered_in: 20 })).toBe(true) })
    expect(request.mock.calls[1][1]).toEqual([8])
    expect(onSucceeded).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBeUndefined()
  })

  it('partial failure of the delivery time (nulls): the count alone, and the retry narrows too', async () => {
    const request = jest.fn().mockResolvedValueOnce([{}, null, null]).mockResolvedValueOnce([{}, null])
    const { result } = setup(request, [7, 8, 9])
    await act(async () => { await result.current.update(8, { delivered_in: 20 }) })
    expect(result.current.error).toBe('Orders that did not change: 2')
    await act(async () => { await result.current.update(8, { delivered_in: 20 }) })
    expect(request.mock.calls[1][1]).toEqual([8, 9])
    // One of the two changed on the retry: the one left is the count again.
    expect(result.current.error).toBe('Orders that did not change: 1')
  })

  it('a retry that fails the same orders again keeps counting the ones of the group that did not change', async () => {
    const request = jest.fn().mockResolvedValueOnce([ok(7), refused(8, ['Nope'])]).mockResolvedValueOnce([refused(8, ['Nope again'])])
    const { result } = setup(request)
    await act(async () => { await result.current.update(8, {}) })
    await act(async () => { await result.current.update(8, {}) })
    expect(result.current.error).toBe('Orders that did not change: 1 · Nope again')
  })

  it('the delivery codes are sent per order and the retry only for the ones that did not change', async () => {
    const request = jest.fn()
      .mockResolvedValueOnce([ok(7)])
      .mockResolvedValueOnce([refused(8, ['Delivery pin is invalid'])])
      .mockResolvedValueOnce([ok(8)])
    const { result } = setup(request)
    const options = { deliveryPins: { 7: '1111', 8: '0000' } }
    await act(async () => { await result.current.update(11, { status: 11 }, options) })
    expect(request.mock.calls.map((call) => call[1])).toEqual([[7], [8]])
    await act(async () => { await result.current.update(11, { status: 11 }, { deliveryPins: { 7: '1111', 8: '2222' } }) })
    expect(request.mock.calls[2][1]).toEqual([8])
    expect(request.mock.calls[2][2]).toEqual({ status: 11, delivery_pin: '2222' })
  })

  it('tells the codes and the wait of the first order, which the view reads for its own delivery code', async () => {
    const request = jest.fn().mockResolvedValue([{ id: 7, result: ['Too many attempts'], error: true, errorCodes: ['delivery_pin.too_many_attempts'], retryAfter: 30 }])
    const { result } = setup(request, [7])
    await act(async () => { await result.current.update(11, {}, { deliveryPins: { 7: '0000' } }) })
    expect(result.current.errorCodes).toEqual(['delivery_pin.too_many_attempts'])
    expect(result.current.retryAfter).toBe(30)
  })

  it('reset forgets the failure: a new view starts from every order and no error', async () => {
    const request = jest.fn().mockResolvedValueOnce([ok(7), null]).mockResolvedValueOnce([{}, {}])
    const { result } = setup(request)
    await act(async () => { await result.current.update(8, {}) })
    expect(result.current.error).toBeTruthy()
    act(() => result.current.reset())
    expect(result.current.error).toBeUndefined()
    await act(async () => { await result.current.update(8, {}) })
    expect(request.mock.calls[1][1]).toEqual([7, 8])
  })

  describe('a change to save offline', () => {
    it('sends nothing and answers the orders as they will be, with the new status and the one they had', async () => {
      const request = jest.fn()
      const orders = [{ id: 7, status: 3, number: 'a' }, { id: 8, status: 3, number: 'b' }, { id: 9, status: 3 }]
      const onSucceeded = jest.fn()
      const { result } = renderHook((props: any) => useGroupStatusUpdate(props), { initialProps: { ids: [7, 8], orders, handleChangeOrderStatus: request, onSucceeded } })
      let answer: any
      await act(async () => { answer = await result.current.update(9, { status: 9 }, { dataToSave: { status: 9, unsync: true } }) })
      expect(request).not.toHaveBeenCalled()
      expect(onSucceeded).not.toHaveBeenCalled()
      // Only the orders the screen changes, never a flag.
      expect(answer).toEqual([
        { id: 7, status: 9, number: 'a', unsync: true, oldStatus: 3 },
        { id: 8, status: 9, number: 'b', unsync: true, oldStatus: 3 }
      ])
      // The orders themselves are not touched (the list's own state).
      expect(orders[0].status).toBe(3)
    })

    it('answers an empty list when it does not know the orders', async () => {
      const { result } = setup(jest.fn())
      let answer: any
      await act(async () => { answer = await result.current.update(9, {}, { dataToSave: { status: 9, unsync: true } }) })
      expect(answer).toEqual([])
    })
  })

  it('does nothing without a request', async () => {
    const { result, onSucceeded } = setup(undefined)
    let answer: any = 'unset'
    await act(async () => { answer = await result.current.update(8, {}) })
    expect(answer).toBeUndefined()
    expect(onSucceeded).not.toHaveBeenCalled()
  })
})
