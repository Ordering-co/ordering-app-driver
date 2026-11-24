import React from 'react'
import { render, act } from '@testing-library/react-native'

import { clearRouteSource, currentRouteSource, publishRouteSource, useRouteSource } from '../routeSource'

describe('the route\'s source (routeSource)', () => {
  beforeEach(() => clearRouteSource())

  it('is empty until the list hands its rows over', () => {
    expect(currentRouteSource()).toEqual({ rows: [] })
  })

  it('tells every reader when the rows or the request change, and only then', () => {
    const renders: any[] = []
    const Reader = () => { renders.push(useRouteSource()); return null }
    render(<Reader />)
    const rows = [{ id: 1 }]
    const request = jest.fn()
    act(() => publishRouteSource({ rows, changeOrderStatus: request }))
    expect(renders[renders.length - 1]).toEqual({ rows, changeOrderStatus: request })
    const count = renders.length
    act(() => publishRouteSource({ rows, changeOrderStatus: request }))
    expect(renders).toHaveLength(count)
    act(() => publishRouteSource({ rows: [...rows], changeOrderStatus: request }))
    expect(renders).toHaveLength(count + 1)
  })

  it('goes back to empty when it is cleared, and a reader that is gone is not told', () => {
    const listener = jest.fn()
    const Reader = () => { listener(useRouteSource().rows); return null }
    const screen = render(<Reader />)
    act(() => publishRouteSource({ rows: [{ id: 1 }] }))
    act(() => clearRouteSource())
    expect(listener).toHaveBeenLastCalledWith([])
    screen.unmount()
    const calls = listener.mock.calls.length
    act(() => publishRouteSource({ rows: [{ id: 2 }] }))
    expect(listener.mock.calls).toHaveLength(calls)
  })
})
