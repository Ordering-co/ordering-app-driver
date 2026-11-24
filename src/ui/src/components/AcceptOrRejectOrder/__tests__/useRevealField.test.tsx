import { act, renderHook } from '@testing-library/react-native'
import { Keyboard, Platform } from 'react-native'

import { useRevealField } from '../useRevealField'

const layout = (y: number, height: number) => ({ nativeEvent: { layout: { x: 0, y, width: 300, height } } }) as any

describe('useRevealField', () => {
  const listeners: Record<string, Array<() => void>> = {}
  const scrollTo = jest.fn()
  let focused = true

  const setup = () => renderHook(() => useRevealField({ current: { scrollTo } } as any, { current: { isFocused: () => focused } } as any))
  const emit = (event: string, frame?: any) => act(() => { (listeners[event] || []).forEach((cb: any) => cb(frame)) })

  beforeEach(() => {
    scrollTo.mockClear()
    focused = true
    Object.keys(listeners).forEach((key) => delete listeners[key])
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, cb: () => void) => {
      (listeners[event] = listeners[event] || []).push(cb)
      return { remove: jest.fn() }
    }) as any)
  })
  afterEach(() => jest.restoreAllMocks())

  it('brings the field block to the top of the room the scroll shows', () => {
    const { result } = setup()
    act(() => { result.current.onScrollLayout(layout(0, 300)) })
    act(() => { result.current.onBlockLayout(layout(480, 100)) })
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 0, y: 480, animated: true })
  })

  it('goes again once the keyboard has finished showing, with the room it left (the focus came first)', () => {
    const { result } = setup()
    act(() => { result.current.onScrollLayout(layout(0, 600)) })
    act(() => { result.current.onBlockLayout(layout(480, 100)) })
    act(() => result.current.onFocus())
    scrollTo.mockClear()
    // The keyboard-avoiding padding shrank the scroll after the focus: its layout comes with the final room.
    act(() => { result.current.onScrollLayout(layout(0, 250)) })
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 0, y: 480, animated: true })
    scrollTo.mockClear()
    emit('keyboardDidShow')
    expect(scrollTo).toHaveBeenCalledTimes(1)
    emit('keyboardDidChangeFrame')
    expect(scrollTo).toHaveBeenCalledTimes(2)
  })

  it('keeps the end of the field in sight while typing makes it taller than the room', () => {
    const { result } = setup()
    act(() => { result.current.onScrollLayout(layout(0, 250)) })
    act(() => { result.current.onBlockLayout(layout(100, 120)) })
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 0, y: 100, animated: true })
    act(() => { result.current.onBlockLayout(layout(100, 400)) })
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 0, y: 250, animated: true })
    act(() => result.current.onContentSizeChange())
    expect(scrollTo).toHaveBeenLastCalledWith({ x: 0, y: 250, animated: true })
  })

  it('does not move the scroll when the field is not the one being typed in', () => {
    focused = false
    const { result } = setup()
    act(() => { result.current.onScrollLayout(layout(0, 250)) })
    act(() => { result.current.onBlockLayout(layout(480, 100)) })
    emit('keyboardDidShow')
    act(() => result.current.onContentSizeChange())
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('Android: a keyboard that takes no room (a floating Gboard) does not move the scroll; a docked one does', () => {
    const original = Platform.OS
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' })
    const { result } = setup()
    act(() => { result.current.onScrollLayout(layout(0, 600)) })
    act(() => { result.current.onBlockLayout(layout(480, 100)) })
    scrollTo.mockClear()
    emit('keyboardDidShow', { endCoordinates: { height: 0, screenY: 900 } })
    expect(scrollTo).not.toHaveBeenCalled()
    emit('keyboardDidShow', { endCoordinates: { height: 300 } })
    expect(scrollTo).toHaveBeenCalledTimes(1)
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original })
  })

  it('does nothing before the room and the block are known', () => {
    const { result } = setup()
    act(() => result.current.onFocus())
    emit('keyboardDidShow')
    expect(scrollTo).not.toHaveBeenCalled()
  })
})
