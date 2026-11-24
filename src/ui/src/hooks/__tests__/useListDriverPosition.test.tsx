import { renderHook, act } from '@testing-library/react-native'

jest.mock('../useLocation', () => ({ useLocation: jest.fn() }))

import { useLocation } from '../useLocation'
import { resetListDriverPosition, useListDriverPosition } from '../useListDriverPosition'

const none = { latitude: 0, longitude: 0, speed: 0, mocked: false }
const fix = (latitude: number, longitude: number) => ({ latitude, longitude, speed: 0, mocked: false, timestamp: 1 })

describe('useListDriverPosition: the position of the list\'s distances', () => {
  let getCurrentLocation: jest.Mock

  beforeEach(() => {
    resetListDriverPosition()
    getCurrentLocation = jest.fn().mockResolvedValue(fix(1, 1))
    ;(useLocation as jest.Mock).mockReturnValue({ userLocation: none, getCurrentLocation })
  })

  it('has no position until a fix arrives (the 0, 0 the location hook starts with is none)', () => {
    const { result } = renderHook(() => useListDriverPosition())
    expect(result.current.position).toBeNull()
  })

  it('takes the fix the location hook reads and gives the new one when the driver has moved', () => {
    const { result, rerender } = renderHook(() => useListDriverPosition())
    ;(useLocation as jest.Mock).mockReturnValue({ userLocation: fix(40.7, -74), getCurrentLocation })
    rerender({})
    expect(result.current.position).toEqual(expect.objectContaining({ latitude: 40.7, longitude: -74 }))
    ;(useLocation as jest.Mock).mockReturnValue({ userLocation: fix(40.8, -74), getCurrentLocation })
    rerender({})
    expect(result.current.position).toEqual(expect.objectContaining({ latitude: 40.8 }))
  })

  it('keeps the last position when the location hook drops to "none" (a reload, a failed read): the distance never blinks off', () => {
    ;(useLocation as jest.Mock).mockReturnValue({ userLocation: fix(40.7, -74), getCurrentLocation })
    const { result, rerender } = renderHook(() => useListDriverPosition())
    ;(useLocation as jest.Mock).mockReturnValue({ userLocation: none, getCurrentLocation })
    rerender({})
    expect(result.current.position).toEqual(expect.objectContaining({ latitude: 40.7 }))
    ;(useLocation as jest.Mock).mockReturnValue({ userLocation: { latitude: NaN, longitude: NaN }, getCurrentLocation })
    rerender({})
    expect(result.current.position).toEqual(expect.objectContaining({ latitude: 40.7 }))
  })

  it('keeps it beyond the screen too: a list drawn again starts from the last fix, not from none', () => {
    ;(useLocation as jest.Mock).mockReturnValue({ userLocation: fix(40.7, -74), getCurrentLocation })
    renderHook(() => useListDriverPosition()).unmount()
    ;(useLocation as jest.Mock).mockReturnValue({ userLocation: none, getCurrentLocation })
    const again = renderHook(() => useListDriverPosition())
    expect(again.result.current.position).toEqual(expect.objectContaining({ latitude: 40.7 }))
  })

  it('reads the position once each time it is asked (the list\'s reload), with no watch and no timer', () => {
    jest.useFakeTimers()
    try {
      const { result } = renderHook(() => useListDriverPosition())
      expect(getCurrentLocation).not.toHaveBeenCalled()
      act(() => { result.current.refresh() })
      expect(getCurrentLocation).toHaveBeenCalledTimes(1)
      act(() => { result.current.refresh() })
      expect(getCurrentLocation).toHaveBeenCalledTimes(2)
      expect(jest.getTimerCount()).toBe(0)
    } finally {
      jest.useRealTimers()
    }
  })

  it('has a stable refresh, so a reload that holds it does not change with each render', () => {
    const { result, rerender } = renderHook(() => useListDriverPosition())
    const first = result.current.refresh
    rerender({})
    expect(result.current.refresh).toBe(first)
  })

  it('keeps the previous position when the read fails (a rejection, a throw, nothing at all)', async () => {
    ;(useLocation as jest.Mock).mockReturnValue({ userLocation: fix(40.7, -74), getCurrentLocation })
    const { result } = renderHook(() => useListDriverPosition())
    getCurrentLocation.mockRejectedValueOnce({ err: 'timeout' })
    await act(async () => { result.current.refresh() })
    getCurrentLocation.mockImplementationOnce(() => { throw new Error('no module') })
    await act(async () => { result.current.refresh() })
    ;(useLocation as jest.Mock).mockReturnValue({ userLocation: none, getCurrentLocation: undefined })
    await act(async () => { result.current.refresh() })
    expect(result.current.position).toEqual(expect.objectContaining({ latitude: 40.7, longitude: -74 }))
  })
})
