import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { Modal, Platform, StyleSheet, View } from 'react-native'
import { FullWindowOverlay } from 'react-native-screens'
import { useTheme } from 'styled-components/native'

import { nativeBoxStyle, nativeTextStyle, themeColor, themeGutter, themeSpace, themeTitleAlign } from '@/theme/helpers'
import OButton from './OButton'
import OText from './OText'
import { navigationRef, focusedRouteKeys } from '@/navigators/NavigationRef'
import { registerConfirmHost, type ConfirmRequest } from './confirmAction'

/** A request waiting its turn: answered once (`done`), asked over the screen (`routeKey`) that was in front. */
interface Entry { request: ConfirmRequest, routeKey?: string, done: boolean }

const dialogStyles = (theme: any) => {
  const modal = theme.native.components.modal.base
  return StyleSheet.create({
    // The theme's scrim over the whole window, the box centered on the page gutter.
    scrim: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: themeGutter(theme),
      backgroundColor: themeColor(theme, 'overlay'),
    },
    // The modal's box (`components.modal`, as `OModal box`: "Remove account"), never wider than its `sm` width.
    box: {
      width: '100%',
      maxWidth: theme.native.components.modal.sizes.sm.width,
      borderRadius: modal.radius,
      padding: modal.padding,
      gap: modal.gap,
      ...nativeBoxStyle({ background: modal.background, shadow: modal.shadow }),
    },
    title: { ...nativeTextStyle(modal.title), color: themeColor(theme, 'text'), textAlign: themeTitleAlign(theme) },
    actions: { gap: themeSpace(theme, 'sm') },
  })
}

/**
 * The app's confirmations and notices (`presentConfirm`, `useConfirm`, `OAlertOriginal`) in the modal's box (as
 * "Remove account"): the title, the message, and the buttons stacked, the accept one first (solid, the danger color
 * when it cannot be undone) and Cancel under it, the app's neutral outline. The hardware back key of Android, as a
 * tap on the scrim, is the way out: it cancels (a notice, which has one button, closes). One dialog at a time; a
 * request that comes while one is open waits for its turn.
 *
 * Mounted once, at the root. On iOS it is drawn in a window of its own above the app's (`FullWindowOverlay`), so it
 * shows over a sheet or a modal page too (a second `Modal` cannot be presented while another is on screen); on
 * Android it is a `Modal`, and dialogs stack.
 */
export const ConfirmDialogHost = () => {
  const theme: any = useTheme()
  // The queue is a ref, the single source of truth: an answer is judged against it at once (two taps that arrive before a
  // render see the same dialog), and the unmount reads it to cancel what is still pending.
  const queue = useRef<Entry[]>([])
  const [, render] = useReducer((count: number) => count + 1, 0)
  const styles = useMemo(() => dialogStyles(theme), [theme])

  // A request leaves the queue once, whatever reaches it first (its button, the back key, the scrim, a second tap): only
  // that one is dropped, the next in line is never answered by the same touch, and a destructive callback runs once.
  const settle = useCallback((entry: Entry, accepted: boolean) => {
    if (entry.done) return
    entry.done = true
    queue.current = queue.current.filter((waiting) => waiting !== entry)
    render()
    if (accepted) entry.request.onAccept?.()
    else entry.request.onCancel?.()
  }, [])

  useEffect(() => {
    const unregister = registerConfirmHost((request) => {
      queue.current = [...queue.current, { request, routeKey: request.routeKey, done: false }]
      render()
    })
    // A question whose screen is no longer in front (a push covered it, it was popped, another tab came to the front) is
    // withdrawn, as Cancel would: its accept must not run for a screen the driver is not looking at. The screen is the one
    // that asked (its own route, known when it was drawn), looked for among the routes in front each time the navigation
    // publishes a state: a screen that is just appearing is in front by then, so a question it asks while the transition
    // runs stays, and only one whose screen has really left goes. A question asked from outside the screens (no route) and a
    // notice, which only acknowledges, stay.
    const unsubscribe = navigationRef.current?.addListener?.('state', () => {
      const inFront = focusedRouteKeys()
      if (!inFront.length) return
      queue.current
        .filter((entry) => !entry.request.notice && entry.routeKey && !inFront.includes(entry.routeKey))
        .forEach((entry) => settle(entry, false))
    })
    return () => {
      unregister()
      unsubscribe?.()
      // The host is leaving (the app mounted its tree again): the screens that asked go with it, so their questions are
      // answered as Cancel instead of waiting for a dialog that will never be drawn. A notice has nothing to undo.
      const pending = queue.current
      queue.current = []
      pending.forEach((entry) => {
        if (entry.done) return
        entry.done = true
        if (!entry.request.notice) entry.request.onCancel?.()
      })
    }
  }, [settle])

  const entry = queue.current[0]
  const request = entry?.request
  const answer = (accepted: boolean) => { if (entry) settle(entry, accepted) }

  if (!request) return null

  const dialog = (
    <View style={[StyleSheet.absoluteFill, styles.scrim]} testID='confirm-dialog'>
      <View style={styles.box} accessibilityViewIsModal>
        {!!request.title && <OText style={styles.title} accessibilityRole='header'>{request.title}</OText>}
        {!!request.message && <OText testID='confirm-message'>{request.message}</OText>}
        <View style={styles.actions}>
          <OButton
            testID='confirm-accept'
            text={request.acceptText}
            color={request.destructive ? 'danger' : 'primary'}
            onClick={() => answer(true)}
          />
          {!request.notice && (
            <OButton
              testID='confirm-cancel'
              text={request.cancelText}
              color='neutral'
              appearance='outline'
              onClick={() => answer(false)}
            />
          )}
        </View>
      </View>
    </View>
  )

  return Platform.OS === 'ios' ? (
    <FullWindowOverlay>{dialog}</FullWindowOverlay>
  ) : (
    // The back key is the way out: it answers as the Cancel button (or, for a notice, as its one button).
    <Modal transparent statusBarTranslucent animationType='fade' visible onRequestClose={() => answer(!!request.notice)}>
      {dialog}
    </Modal>
  )
}

export default ConfirmDialogHost
