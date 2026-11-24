import { renderHook } from '@testing-library/react-native'

import { useStableCallback } from '../useStableCallback'

describe('useStableCallback', () => {
  it('is the same function on every render', () => {
    const { result, rerender } = renderHook(({ fn }: any) => useStableCallback(fn), { initialProps: { fn: jest.fn() } })
    const first = result.current
    rerender({ fn: jest.fn() })
    expect(result.current).toBe(first)
  })

  it('calls the latest function it was given, with the arguments, and answers what it answered', () => {
    const before = jest.fn(() => 'before')
    const after = jest.fn((a: number, b: number) => a + b)
    const { result, rerender } = renderHook(({ fn }: any) => useStableCallback(fn), { initialProps: { fn: before as any } })
    const kept = result.current
    rerender({ fn: after })
    expect(kept(2, 3)).toBe(5)
    expect(after).toHaveBeenCalledWith(2, 3)
    expect(before).not.toHaveBeenCalled()
  })

  it('does nothing, and answers nothing, without a function', () => {
    const { result } = renderHook(() => useStableCallback(undefined))
    expect(result.current()).toBeUndefined()
  })
})
