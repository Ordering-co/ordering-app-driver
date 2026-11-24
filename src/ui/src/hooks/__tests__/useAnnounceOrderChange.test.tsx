import React from 'react'
import { render } from '@testing-library/react-native'
import { EventEmitter } from 'events'

const mockEvents = new EventEmitter()
jest.mock('@components', () => ({ useEvent: () => [mockEvents] }))

import { ORDER_CHANGED_EVENT, useAnnounceOrderChange } from '../useAnnounceOrderChange'

let announce: ReturnType<typeof useAnnounceOrderChange>
const Probe = () => { announce = useAnnounceOrderChange(); return null }

describe('useAnnounceOrderChange (the lists hear a change made on another screen without the socket)', () => {
  afterEach(() => mockEvents.removeAllListeners())

  it('emits the app\'s event once per call, carrying the change', () => {
    render(<Probe />)
    const heard = jest.fn()
    mockEvents.on(ORDER_CHANGED_EVENT, heard)
    announce({ orderIds: [101] })
    announce({ orderIds: [102], request: true, accepted: true })
    expect(heard).toHaveBeenCalledTimes(2)
    expect(heard).toHaveBeenNthCalledWith(1, { orderIds: [101] })
    expect(heard).toHaveBeenNthCalledWith(2, { orderIds: [102], request: true, accepted: true })
  })

  it('is one function for the life of the screen, and still works after the screen is gone (a request answered later)', () => {
    const view = render(<Probe />)
    const first = announce
    view.rerender(<Probe />)
    expect(announce).toBe(first)
    const heard = jest.fn()
    mockEvents.on(ORDER_CHANGED_EVENT, heard)
    view.unmount()
    first({ orderIds: [101] })
    expect(heard).toHaveBeenCalledTimes(1)
  })
})
