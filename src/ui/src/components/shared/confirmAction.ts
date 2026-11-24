import { useCallback, useContext } from 'react'
import { Alert } from 'react-native'
import { NavigationRouteContext } from '@react-navigation/native'
import { useLanguage } from '@components'

export interface ConfirmOptions {
  /** The dialog's title: the app's name when it is not given, as the app's other dialogs. */
  title?: string
  message?: string
  /** The accept button is named after the action ("Delete", "Logout"): never a bare "OK". */
  acceptText: string
  /** What the other button says: "Cancel" unless the question needs a clearer way out ("Keep editing"). */
  cancelText?: string
  /** The action cannot be undone: its button is the danger one. */
  destructive?: boolean
  /** A notice, not a question: one button ("OK") that closes it, and no way out to ask for. */
  notice?: boolean
  /**
   * The route of the screen that asks (`useConfirm` and `OAlertOriginal` read it from where they are drawn): a question is
   * withdrawn, as Cancel, when that route is no longer in front. None for what the app asks from outside its screens.
   */
  routeKey?: string
  onAccept?: () => void
  /** The way out: the Cancel button, the hardware back key of Android or a tap on the scrim. */
  onCancel?: () => void
}

/** What the dialog host is given: the options with the texts it draws. */
export type ConfirmRequest = Omit<ConfirmOptions, 'cancelText'> & { cancelText: string }

type Present = (request: ConfirmRequest) => void
let host: Present | null = null

/**
 * The dialog host (`ConfirmDialogHost`, mounted once at the root) takes the app's confirmations and notices: they are
 * its themed dialog, never a system alert (teal buttons on Android, no hardware back to dismiss them). Returns what
 * unregisters it.
 */
export const registerConfirmHost = (present: Present) => {
  host = present
  return () => { if (host === present) host = null }
}

/**
 * The app's confirmation, in the themed dialog: accept first (a destructive one in the danger look) and cancel
 * second. One implementation for the declarative `OAlertOriginal` (a piece with an `open` state) and for `useConfirm`
 * (a handler that asks on the spot). Before the host is mounted (a launch in progress, or a test) the system alert stands in,
 * so a question is never lost.
 */
export const presentConfirm = (request: ConfirmRequest) => {
  if (host) {
    host(request)
    return
  }
  const { title, message, acceptText, cancelText, destructive, notice, onAccept, onCancel } = request
  Alert.alert(title ?? '', message, [
    { text: acceptText, ...(destructive && { style: 'destructive' as const }), onPress: onAccept },
    ...(notice ? [] : [{ text: cancelText, onPress: onCancel }]),
  ])
}

/**
 * The route of the screen the caller is drawn in (`undefined` outside a screen). It is the screen's own, known when it is
 * drawn: it does not depend on which route the navigation reports as in front at the moment of asking, which is not settled
 * while a screen is appearing.
 */
export const useRouteKey = (): string | undefined => useContext(NavigationRouteContext)?.key

/**
 * `confirm({ message, acceptText, destructive, onAccept })`: asks the driver before something that
 * cannot be undone, with the app's name as the title and "Cancel" to go back unless the call says
 * otherwise. Nothing happens until the accept button is pressed.
 */
export const useConfirm = () => {
  const [, t] = useLanguage()
  const routeKey = useRouteKey()
  return useCallback((options: ConfirmOptions) => presentConfirm({
    routeKey,
    ...options,
    title: options.title ?? t('WEB_APPNAME', 'Ordering'),
    cancelText: options.cancelText ?? t('CANCEL', 'Cancel'),
  }), [t, routeKey])
}

/**
 * `notify({ title, message })`: tells the driver something that blocks (an error that stops what he was doing): the
 * same dialog with one "OK" button.
 */
export const useNotice = () => {
  const [, t] = useLanguage()
  return useCallback((options: Pick<ConfirmOptions, 'title' | 'message' | 'onAccept'> & { acceptText?: string }) => presentConfirm({
    ...options,
    notice: true,
    title: options.title ?? t('WEB_APPNAME', 'Ordering'),
    acceptText: options.acceptText ?? t('OK', 'Ok'),
    cancelText: t('CANCEL', 'Cancel'),
  }), [t])
}
