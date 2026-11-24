import React from 'react'
import { Alert, Modal, Platform, StyleSheet, View } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'
import { renderHook } from '@testing-library/react-native'

const { captureDialogs } = require('../../../../../../jest/helpers/confirmDialogs')
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { setupSharedComponentHooks } = require('../../../../../../jest/helpers/driverSharedTestSetup')
import { defaultAppTheme } from '../../../../../theme/engine'
import { ConfirmDialogHost } from '../ConfirmDialogHost'
import { presentConfirm, useConfirm, useNotice } from '../confirmAction'

setupSharedComponentHooks()

const ask = (options: any = {}) => act(() => {
  presentConfirm({ title: 'Ordering', message: 'Sure?', acceptText: 'Delete', cancelText: 'Cancel', onAccept: jest.fn(), ...options })
})
const background = (node: any) => StyleSheet.flatten(node.findByType(View).props.style)?.backgroundColor

describe('the app\'s themed confirmation dialog', () => {
  afterEach(() => jest.restoreAllMocks())

  it('draws nothing until something is asked, and never the system alert once it is mounted', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    const { toJSON, getByText } = renderWithProviders(<ConfirmDialogHost />)
    expect(toJSON()).toBeNull()
    ask()
    expect(getByText('Ordering')).toBeTruthy()
    expect(getByText('Sure?')).toBeTruthy()
    expect(alert).not.toHaveBeenCalled()
  })

  it('has the accept button first and Cancel under it, and fires nothing until a button is pressed', () => {
    const onAccept = jest.fn()
    const onCancel = jest.fn()
    const { getByTestId, getByText, queryByTestId, toJSON } = renderWithProviders(<ConfirmDialogHost />)
    ask({ onAccept, onCancel })
    const text = JSON.stringify(toJSON())
    expect(text.indexOf('Delete')).toBeLessThan(text.indexOf('Cancel'))
    expect(onAccept).not.toHaveBeenCalled()
    fireEvent.press(getByText('Delete'))
    expect(onAccept).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
    expect(queryByTestId('confirm-dialog')).toBeNull()
    ask({ onAccept, onCancel })
    fireEvent.press(getByTestId('confirm-cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onAccept).toHaveBeenCalledTimes(1)
  })

  it('paints a destructive accept in the danger look and any other in the primary one', () => {
    const { getByTestId } = renderWithProviders(<ConfirmDialogHost />)
    ask({ destructive: true })
    const danger = background(getByTestId('confirm-accept'))
    fireEvent.press(getByTestId('confirm-cancel'))
    ask()
    const primary = background(getByTestId('confirm-accept'))
    const buttons = (defaultAppTheme() as any).native.components.button.variants
    expect(danger).toBe(buttons.danger.solid.background)
    expect(primary).toBe(buttons.primary.solid.background)
  })

  it('is a notice with one button when it only tells something', () => {
    const onAccept = jest.fn()
    const { getByTestId, queryByTestId, queryByText } = renderWithProviders(<ConfirmDialogHost />)
    ask({ notice: true, acceptText: 'Ok', onAccept })
    expect(queryByTestId('confirm-cancel')).toBeNull()
    expect(queryByText('Cancel')).toBeNull()
    fireEvent.press(getByTestId('confirm-accept'))
    expect(onAccept).toHaveBeenCalledTimes(1)
  })

  it('takes one dialog at a time: the next waits for the first to be answered', () => {
    const { getByText, queryByText } = renderWithProviders(<ConfirmDialogHost />)
    ask({ title: 'First', message: 'one', acceptText: 'Yes one' })
    ask({ title: 'Second', message: 'two', acceptText: 'Yes two' })
    expect(queryByText('Second')).toBeNull()
    fireEvent.press(getByText('Yes one'))
    expect(getByText('Second')).toBeTruthy()
    expect(queryByText('First')).toBeNull()
  })

  describe('one answer per dialog', () => {
    afterEach(() => { jest.replaceProperty(Platform, 'OS', 'ios') })

    it('a double tap on accept runs the action once and leaves the next dialog in the queue', () => {
      const first = jest.fn()
      const second = jest.fn()
      const { getByTestId, getByText } = renderWithProviders(<ConfirmDialogHost />)
      ask({ title: 'First', acceptText: 'Yes one', onAccept: first })
      ask({ title: 'Second', acceptText: 'Yes two', onAccept: second })
      // Both taps reach the button before the screen has drawn the next dialog: they hold the first dialog's handler.
      const tap = getByTestId('confirm-accept').props.onClick
      act(() => { tap(); tap() })
      expect(first).toHaveBeenCalledTimes(1)
      expect(second).not.toHaveBeenCalled()
      expect(getByText('Second')).toBeTruthy()
      fireEvent.press(getByText('Yes two'))
      expect(second).toHaveBeenCalledTimes(1)
    })

    it('cancel, the scrim\'s back key and a second cancel arriving together answer once, and accept after cancel never runs', () => {
      jest.replaceProperty(Platform, 'OS', 'android')
      const onAccept = jest.fn()
      const onCancel = jest.fn()
      const next = jest.fn()
      const view = renderWithProviders(<ConfirmDialogHost />)
      ask({ title: 'First', onAccept, onCancel })
      ask({ title: 'Second', onAccept: next })
      const cancel = view.getByTestId('confirm-cancel').props.onClick
      const accept = view.getByTestId('confirm-accept').props.onClick
      const back = view.UNSAFE_getByType(Modal).props.onRequestClose
      act(() => { cancel(); back(); accept(); cancel() })
      expect(onCancel).toHaveBeenCalledTimes(1)
      expect(onAccept).not.toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
      expect(view.getByText('Second')).toBeTruthy()
    })
  })

  describe('a host that leaves', () => {
    it('answers the pending questions as Cancel, once, and a late tap on them does nothing', () => {
      const onAccept = jest.fn()
      const onCancel = jest.fn()
      const queuedCancel = jest.fn()
      const view = renderWithProviders(<ConfirmDialogHost />)
      ask({ onAccept, onCancel })
      ask({ onAccept, onCancel: queuedCancel })
      const accept = view.getByTestId('confirm-accept').props.onClick
      view.unmount()
      expect(onCancel).toHaveBeenCalledTimes(1)
      expect(queuedCancel).toHaveBeenCalledTimes(1)
      act(() => accept())
      expect(onAccept).not.toHaveBeenCalled()
      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('does not run the action of a notice it never showed', () => {
      const onAccept = jest.fn()
      const onCancel = jest.fn()
      const view = renderWithProviders(<ConfirmDialogHost />)
      ask({ notice: true, acceptText: 'Ok', onAccept, onCancel })
      view.unmount()
      expect(onAccept).not.toHaveBeenCalled()
      expect(onCancel).not.toHaveBeenCalled()
    })
  })

  describe('a question whose screen leaves the front', () => {
    const { navigationRef } = require('../../../../../navigators/NavigationRef')
    // The navigation as the container reports it: a root stack with a tab navigator, each level with its focused route.
    const stack = (keys: string[], tab?: { routes: string[], index: number, stacks?: Record<string, string[]> }) => ({
      index: keys.length - 1,
      routes: keys.map((key) => key === 'tabs' && tab
        ? { key, state: { index: tab.index, routes: tab.routes.map((name) => ({ key: name, state: tab.stacks?.[name] && { index: tab.stacks[name].length - 1, routes: tab.stacks[name].map((k) => ({ key: k })) } })) } }
        : { key })
    })
    let state: any
    let publish: () => void = () => {}
    const navigate = (next: any) => { state = next; act(() => publish()) }

    beforeEach(() => {
      state = stack(['tabs'], { routes: ['orders', 'map'], index: 0, stacks: { orders: ['ordersList'] } })
      navigationRef.current = {
        getRootState: () => state,
        addListener: (_event: string, listener: () => void) => { publish = listener; return () => {} }
      }
    })
    afterEach(() => { navigationRef.current = null })

    it('is withdrawn as Cancel, once, when the screen is popped; a notice from it stays', () => {
      state = stack(['tabs', 'details'], { routes: ['orders', 'map'], index: 0 })
      const onAccept = jest.fn()
      const onCancel = jest.fn()
      const onNoticeAccept = jest.fn()
      const view = renderWithProviders(<ConfirmDialogHost />)
      ask({ title: 'Question', routeKey: 'details', onAccept, onCancel })
      ask({ title: 'Notice', routeKey: 'details', notice: true, acceptText: 'Ok', onAccept: onNoticeAccept })
      // Still in front: nothing is withdrawn, however many times the state is published.
      act(() => publish())
      expect(onCancel).not.toHaveBeenCalled()
      navigate(stack(['tabs'], { routes: ['orders', 'map'], index: 0 }))
      expect(onCancel).toHaveBeenCalledTimes(1)
      navigate(stack(['tabs'], { routes: ['orders', 'map'], index: 0 }))
      expect(onCancel).toHaveBeenCalledTimes(1)
      expect(onAccept).not.toHaveBeenCalled()
      // The notice stays and is shown now.
      expect(view.getByText('Notice')).toBeTruthy()
    })

    it('is withdrawn when another screen is pushed over the one that asked', () => {
      state = stack(['tabs', 'details'], { routes: ['orders', 'map'], index: 0 })
      const onCancel = jest.fn()
      renderWithProviders(<ConfirmDialogHost />)
      ask({ routeKey: 'details', onCancel })
      navigate(stack(['tabs', 'details', 'chat'], { routes: ['orders', 'map'], index: 0 }))
      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('stays when asked by a screen that is just appearing: its route is in front when the transition\'s state is published, and after', () => {
      // The new screen asks as soon as it is drawn, before the container has published the state that brought it.
      state = stack(['tabs', 'list', 'details'], { routes: ['orders', 'map'], index: 0 })
      const onAccept = jest.fn()
      const onCancel = jest.fn()
      const view = renderWithProviders(<ConfirmDialogHost />)
      ask({ title: 'From the new screen', routeKey: 'details', onAccept, onCancel })
      // The state of the push, and another one when the transition ends (the stack's own bookkeeping).
      act(() => publish())
      act(() => publish())
      expect(onCancel).not.toHaveBeenCalled()
      expect(view.getByText('From the new screen')).toBeTruthy()
      fireEvent.press(view.getByTestId('confirm-accept'))
      expect(onAccept).toHaveBeenCalledTimes(1)
      expect(onCancel).not.toHaveBeenCalled()
    })

    it('goes when the screen that was just appearing is left after all', () => {
      state = stack(['tabs', 'list', 'details'], { routes: ['orders', 'map'], index: 0 })
      const onCancel = jest.fn()
      renderWithProviders(<ConfirmDialogHost />)
      ask({ routeKey: 'details', onCancel })
      act(() => publish())
      navigate(stack(['tabs', 'list'], { routes: ['orders', 'map'], index: 0 }))
      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('stays when its screen is a navigator that gets its inner screens after it asked (a tab screen that is not drawn yet)', () => {
      // Asked from the tab navigator's own screen before the tabs have a state of their own, then the tabs settle.
      state = { index: 0, routes: [{ key: 'tabs' }] }
      const onCancel = jest.fn()
      renderWithProviders(<ConfirmDialogHost />)
      ask({ routeKey: 'tabs', onCancel })
      navigate(stack(['tabs'], { routes: ['orders', 'map'], index: 0, stacks: { orders: ['ordersList'] } }))
      expect(onCancel).not.toHaveBeenCalled()
    })

    it('is withdrawn when the tab that asked goes to the back (a question is about what is on screen, as for a push)', () => {
      const onAccept = jest.fn()
      const onCancel = jest.fn()
      renderWithProviders(<ConfirmDialogHost />)
      ask({ routeKey: 'ordersList', onAccept, onCancel })
      // Another screen of the same tab is not a reason; the tab is.
      navigate(stack(['tabs'], { routes: ['orders', 'map'], index: 0, stacks: { orders: ['ordersList'] } }))
      expect(onCancel).not.toHaveBeenCalled()
      navigate(stack(['tabs'], { routes: ['orders', 'map'], index: 1, stacks: { orders: ['ordersList'] } }))
      expect(onCancel).toHaveBeenCalledTimes(1)
      expect(onAccept).not.toHaveBeenCalled()
    })

    it('is never withdrawn when it was asked from outside the screens (no route), whatever the navigation does', () => {
      const onCancel = jest.fn()
      renderWithProviders(<ConfirmDialogHost />)
      ask({ title: 'Of the app', onCancel })
      navigate(stack(['tabs', 'chat'], { routes: ['orders', 'map'], index: 1 }))
      expect(onCancel).not.toHaveBeenCalled()
    })

    it('waits for a navigation that has a state: nothing is withdrawn before it reports one', () => {
      const onCancel = jest.fn()
      renderWithProviders(<ConfirmDialogHost />)
      ask({ routeKey: 'details', onCancel })
      navigate(undefined)
      expect(onCancel).not.toHaveBeenCalled()
    })
  })

  describe('the way out', () => {
    afterEach(() => { jest.replaceProperty(Platform, 'OS', 'ios') })

    it('is the hardware back key on Android: it cancels a question and closes a notice (a Modal, which stacks over a sheet)', () => {
      jest.replaceProperty(Platform, 'OS', 'android')
      const onAccept = jest.fn()
      const onCancel = jest.fn()
      const view = renderWithProviders(<ConfirmDialogHost />)
      ask({ onAccept, onCancel })
      act(() => view.UNSAFE_getByType(Modal).props.onRequestClose())
      expect(onCancel).toHaveBeenCalledTimes(1)
      expect(onAccept).not.toHaveBeenCalled()
      expect(view.queryByTestId('confirm-dialog')).toBeNull()
      ask({ notice: true, acceptText: 'Ok', onAccept, onCancel })
      act(() => view.UNSAFE_getByType(Modal).props.onRequestClose())
      expect(onAccept).toHaveBeenCalledTimes(1)
      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('has no Modal on iOS: it is a window of its own over the app, so it shows over a sheet too', () => {
      jest.replaceProperty(Platform, 'OS', 'ios')
      const view = renderWithProviders(<ConfirmDialogHost />)
      ask()
      expect(view.UNSAFE_queryAllByType(Modal)).toHaveLength(0)
      expect(view.getByTestId('confirm-dialog')).toBeTruthy()
    })
  })

  describe('what asks goes through it', () => {
    it('useConfirm and useNotice ask the host, with the app\'s name and the usual words', () => {
      const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
      const dialogs = captureDialogs()
      const { result } = renderHook(() => ({ confirm: useConfirm(), notify: useNotice() }))
      result.current.confirm({ message: 'Log out?', acceptText: 'Logout', destructive: true, onAccept: jest.fn() })
      expect(dialogs.last()).toEqual(expect.objectContaining({ title: 'Ordering', message: 'Log out?', acceptText: 'Logout', cancelText: 'Cancel', destructive: true }))
      result.current.notify({ message: 'Link failed' })
      expect(dialogs.last()).toEqual(expect.objectContaining({ title: 'Ordering', message: 'Link failed', acceptText: 'Ok', notice: true }))
      expect(alert).not.toHaveBeenCalled()
      dialogs.off()
    })

    it('useConfirm and OAlertOriginal ask for the route of the screen they are drawn in, and none outside a screen', () => {
      const { NavigationRouteContext } = require('@react-navigation/native')
      const OAlertOriginal = require('../OAlertOriginal').default
      const dialogs = captureDialogs()
      const inScreen = ({ children }: any) => <NavigationRouteContext.Provider value={{ key: 'details-1', name: 'Details' }}>{children}</NavigationRouteContext.Provider>
      const screen = renderHook(() => useConfirm(), { wrapper: inScreen })
      screen.result.current({ message: 'Sure?', acceptText: 'Yes' })
      expect(dialogs.last().routeKey).toBe('details-1')
      const outside = renderHook(() => useConfirm())
      outside.result.current({ message: 'Sure?', acceptText: 'Yes' })
      expect(dialogs.last().routeKey).toBeUndefined()
      renderWithProviders(<OAlertOriginal open title='Ordering' content={['Sure?']} onClose={jest.fn()} onAccept={jest.fn()} />, { wrapper: inScreen } as any)
      expect(dialogs.last().routeKey).toBe('details-1')
      dialogs.off()
    })

    it('falls back to the system alert only while no host is mounted, and again once it is gone', () => {
      const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
      ask({ title: 'Early' })
      expect(alert).toHaveBeenCalledTimes(1)
      const view = renderWithProviders(<ConfirmDialogHost />)
      ask({ title: 'Hosted' })
      expect(alert).toHaveBeenCalledTimes(1)
      view.unmount()
      ask({ title: 'After' })
      expect(alert).toHaveBeenCalledTimes(2)
    })
  })
})
