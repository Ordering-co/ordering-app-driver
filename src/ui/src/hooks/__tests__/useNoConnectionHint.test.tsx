import React from 'react'
import { act, render } from '@testing-library/react-native'

const mockShowToast = jest.fn()
jest.mock('@components', () => ({
  ToastType: { Info: 'info', Success: 'success', Warning: 'warning', Error: 'error' },
  useLanguage: () => [{}, (_key: string, fallback?: string) => fallback ?? _key],
  useToast: () => [{}, { showToast: mockShowToast }]
}))

import { NO_CONNECTION_HINT_MS, useNoConnectionHint } from '../useNoConnectionHint'

let hint: ReturnType<typeof useNoConnectionHint>
const Probe = () => { hint = useNoConnectionHint(); return null }

describe('useNoConnectionHint (what a tap on a button that is off for lack of a connection says)', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockShowToast.mockClear()
  })
  afterEach(() => jest.useRealTimers())

  it('shows one info toast, the catalog\'s text, for the time of the "Hold to confirm" hint', () => {
    render(<Probe />)
    hint()
    expect(mockShowToast).toHaveBeenCalledTimes(1)
    expect(mockShowToast).toHaveBeenCalledWith('info', 'No connection. Try again when the network is back.', NO_CONNECTION_HINT_MS)
    expect(NO_CONNECTION_HINT_MS).toBe(2000)
  })

  it('does not stack on repeated taps while the hint is on screen, and says it again once it is gone', () => {
    render(<Probe />)
    hint()
    hint()
    act(() => { jest.advanceTimersByTime(NO_CONNECTION_HINT_MS - 1) })
    hint()
    expect(mockShowToast).toHaveBeenCalledTimes(1)
    act(() => { jest.advanceTimersByTime(1) })
    hint()
    expect(mockShowToast).toHaveBeenCalledTimes(2)
  })

  it('is one function for the life of the screen', () => {
    const view = render(<Probe />)
    const first = hint
    view.rerender(<Probe />)
    expect(hint).toBe(first)
  })
})
