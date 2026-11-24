import React from 'react'
import { Text } from 'react-native'
import { act, render } from '@testing-library/react-native'
import { afterRelease, holdFinger, resetHoldLatch, useSettledWhileHeld } from '../holdLatch'

const Shown = ({ value }: { value: string }) => <Text testID='shown'>{useSettledWhileHeld(value)}</Text>

describe('holdLatch (what waits for the finger of a completed hold)', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    resetHoldLatch()
  })
  afterEach(() => { jest.useRealTimers() })

  it('shows the latest value when no finger is down', () => {
    const screen = render(<Shown value='a' />)
    screen.rerender(<Shown value='b' />)
    expect(screen.getByTestId('shown').props.children).toBe('b')
  })

  it('keeps what was shown while a finger is down and shows the latest value the moment it lifts', () => {
    const screen = render(<Shown value='a' />)
    let lift: () => void = () => {}
    act(() => { lift = holdFinger() })
    screen.rerender(<Shown value='b' />)
    screen.rerender(<Shown value='c' />)
    expect(screen.getByTestId('shown').props.children).toBe('a')
    act(() => lift())
    expect(screen.getByTestId('shown').props.children).toBe('c')
  })

  it('waits for the last of several fingers, and a finger lifted twice counts once', () => {
    const screen = render(<Shown value='a' />)
    let first: () => void = () => {}
    let second: () => void = () => {}
    act(() => { first = holdFinger(); second = holdFinger() })
    screen.rerender(<Shown value='b' />)
    act(() => { first(); first() })
    expect(screen.getByTestId('shown').props.children).toBe('a')
    act(() => second())
    expect(screen.getByTestId('shown').props.children).toBe('b')
  })

  it('runs what waited, once and in order, when the finger lifts; runs at once when none is down', () => {
    const calls: string[] = []
    let lift: () => void = () => {}
    act(() => { lift = holdFinger() })
    afterRelease(() => calls.push('one'))
    afterRelease(() => calls.push('two'))
    expect(calls).toEqual([])
    act(() => { lift(); lift() })
    expect(calls).toEqual(['one', 'two'])
    afterRelease(() => calls.push('now'))
    expect(calls).toEqual(['one', 'two', 'now'])
  })

  it('lets go by itself when a touch end never comes, so a screen is not frozen for good', () => {
    const screen = render(<Shown value='a' />)
    act(() => { holdFinger() })
    screen.rerender(<Shown value='b' />)
    expect(screen.getByTestId('shown').props.children).toBe('a')
    act(() => { jest.advanceTimersByTime(20000) })
    expect(screen.getByTestId('shown').props.children).toBe('b')
  })

  it('runs everything that waited even when one of them throws, and then reports the first error', () => {
    const calls: string[] = []
    let lift: () => void = () => {}
    act(() => { lift = holdFinger() })
    afterRelease(() => calls.push('one'))
    afterRelease(() => { throw new Error('boom') })
    afterRelease(() => calls.push('three'))
    expect(() => lift()).toThrow('boom')
    expect(calls).toEqual(['one', 'three'])
    // Nothing is left to run twice.
    afterRelease(() => calls.push('now'))
    expect(calls).toEqual(['one', 'three', 'now'])
  })
})
