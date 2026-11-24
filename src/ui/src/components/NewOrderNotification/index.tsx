import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  View,
  NativeModules,
  Platform,
  Vibration,
  AppState
} from 'react-native';
import { useTheme } from 'styled-components/native'
import dayjs from '@/utils/dayjs'
import SoundPlayer from 'react-native-sound-player'
import DeviceInfo from 'react-native-device-info'

import { newOrderAlertStyles } from './styles'
import { addAlert, closeAlert, emptyQueue, openAlert, type AlertItem, type AlertKind, type AlertQueue } from './alertQueue'
import { alertContent, type AlertAction, type AlertContent } from './alertContent'
import { themeImage, themePart } from '@/theme/helpers'

import {
  NewOrderNotification as NewOrderNotificationController,
  useApi,
  useConfig,
  useEvent,
  useLanguage,
  useSession,
  useToast,
  ToastType
} from '@components'

import { useLocation } from '../../hooks/useLocation'
import { navigate, openChatOrderId, openMessagesTab, openOrdersTab } from '@/navigators/NavigationRef'
import { Icon, ModalCloseButton, OBottomPopup, OButton, OText } from '../shared'
import { useSecureOrderId } from '../../hooks/useSecureOrderId'
import { buildDriverLocationPostBody } from './buildDriverLocationPostBody'

/** How long the position and its post may take (ms): the alert never waits for them. */
const LOCATION_POST_MS = 8000

/** `promise`, or a rejection when it has not settled after `ms`: a position that never comes must not hang what waits for it. */
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (value) => { clearTimeout(timer); resolve(value) },
      (error) => { clearTimeout(timer); reject(error) }
    )
  })

/** How often the alert's sound starts again from its beginning while the alert is open (ms). */
const SOUND_CYCLE_MS = 2500
/** The sound the app bundles for its new-order alert (the push notification's too): `res/raw` on Android, the bundle's `.caf` on iOS. */
const SOUND_NAME = 'order_sound_notification'
const soundType = () => (Platform.OS === 'ios' ? 'caf' : 'mp3')

/**
 * The alert while it is open: its sheet, and the sound and the vibration that go with it. Every arrival (`arrival`
 * counts them) starts the loop again, so a new one is heard even when the alert was already open; closing the
 * alert (this component leaves) stops both.
 *
 * The sound is the bundled one, loaded once per run and started again from its beginning every `SOUND_CYCLE_MS`: nothing
 * is fetched (the alert rings with no data, in a lift, in a basement) and no cycle stops the next, the only stop is the exit.
 */
const SoundPlayerComponent = (props: any) => {
  const { content, arrival, onClose, onAction } = props

  const theme: any = useTheme()
  const styles = useMemo(() => newOrderAlertStyles(theme), [theme])
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active')
  const AlarmSound = NativeModules?.AlarmSound
  const useAlarmSound = Platform.OS === 'android' && !!AlarmSound?.start

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setIsAppActive(state === 'active')
    })
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (!isAppActive) {
      return
    }

    Vibration.vibrate([0, 800, 400, 800, 400, 800], true)

    // The same resource the notification channel plays (the player of Android reads it by its URI).
    const alarmUri = `android.resource://${DeviceInfo.getBundleId()}/raw/${SOUND_NAME}`
    const canPlay = useAlarmSound || !!NativeModules?.RNSoundPlayer?.loadSoundFile
    const play = () => {
      try {
        if (useAlarmSound) {
          // A player that is already loaded starts again from 0.
          AlarmSound.start(alarmUri)
        } else {
          SoundPlayer.seek(0)
          SoundPlayer.play()
        }
      } catch (err: any) {
        console.log('Sound Error - ', err.message)
      }
    }
    let id: ReturnType<typeof setInterval> | undefined
    if (canPlay) {
      try {
        if (!useAlarmSound) SoundPlayer.loadSoundFile(SOUND_NAME, soundType())
      } catch (err: any) {
        console.log('Sound Error - ', err.message)
      }
      play()
      id = setInterval(play, SOUND_CYCLE_MS)
    }

    return () => {
      clearInterval(id)
      Vibration.cancel()
      try {
        if (useAlarmSound) AlarmSound.stop()
        else SoundPlayer.stop()
      } catch (err: any) {
        console.log('Sound Error - ', err.message)
      }
    }
  }, [isAppActive, arrival])

  useEffect(() => {
    return () => {
      try {
        if (useAlarmSound && typeof AlarmSound.release === 'function') AlarmSound.release()
      } catch (err: any) {
        console.log('AlarmSound Error - ', err?.message)
      }
    }
  }, [])

  // The theme's illustration while it serves one; none is bundled: otherwise an icon in the brand's
  // text color, at the alert's own icon size (`new_order_alert.base.icon_size`), in a round tint.
  const picture = themeImage(theme, 'empty.new_order')
  const iconSize = themePart(theme, 'new_order_alert', 'base.icon_size')

  return (
    <OBottomPopup
      open
      onClose={onClose}
      padded
      animationType='slide'
      testID='new-order-alert'
    >
      <View style={styles.content}>
        {picture && <Image source={picture} style={styles.image} resizeMode='contain' testID='new-order-image' />}
        {/* The mockup's one row: the tile, the headline over the text, the close button at its end. */}
        <View style={styles.row} testID='new-order-row'>
          {!picture && (
            <View style={styles.tile} testID='new-order-tile'>
              <Icon name='notifications-outline' size={iconSize} color='primary_text' testID='new-order-icon' />
            </View>
          )}
          <View style={styles.copy} testID='new-order-copy'>
            <OText style={styles.title} accessibilityRole='header'>{content.title}</OText>
            <OText style={styles.text}>{content.message}</OText>
            {!!content.numbers && <OText style={styles.text} testID='new-order-numbers'>{content.numbers}</OText>}
          </View>
          <View style={styles.close} testID='new-order-close'>
            <ModalCloseButton onPress={onClose} />
          </View>
        </View>
        {!!content.button && (
          <OButton text={content.button.text} size='lg' onClick={() => onAction(content.button.action)} testID='new-order-view' />
        )}
      </View>
    </OBottomPopup>
  )
}

/** The value an event carries, read as the alert's item and kind (a request for a group says the group, never the request's id). */
const itemOf = (value: any, isMessage: boolean, isRequest: boolean): AlertItem => {
  const status = typeof value?.status === 'number' ? value.status : undefined
  if (isMessage) {
    const orderId = value?.order?.id ?? value?.order_id
    return { key: `o:${orderId}`, orderId }
  }
  if (isRequest) {
    // An assign request: its own `id` is the request's, not an order's. It is for an order or for a group.
    const groupId = value?.order_group_id ?? value?.order_group?.id
    if (groupId != null && value?.order_id == null) {
      const ordersCount = value?.order_group?.orders_count ?? value?.order_group?.orders?.length
      return { key: `g:${groupId}`, groupId, ordersCount: ordersCount > 0 ? ordersCount : undefined }
    }
    const orderId = value?.order_id ?? value?.order?.id ?? value?.id
    return { key: `o:${orderId}`, orderId, status }
  }
  const orderId = value?.order_id ?? value?.id
  return { key: `o:${orderId}`, orderId, status }
}

const kindOf = (evtType: number, isRequest: boolean): AlertKind => {
  if (evtType === 1) return 'message'
  if (evtType === 3) return isRequest ? 'request_update' : 'order_update'
  return isRequest ? 'request' : 'order'
}

/**
 * The alert of the signed-in app, mounted once by the authed navigator (not by a tab: a modal opened from a tab that
 * is not in front is not shown on iOS). It listens to the notifications the orders list emits from the socket's
 * events, and gathers what arrives while it is open (see `alertQueue`).
 */
const NewOrderNotificationUI = (props: any) => {
  const { orderStatus, onOpenRequests } = props
  const [, t] = useLanguage()
  const [events] = useEvent()
  const [{ user, token }] = useSession()
  const [ordering] = useApi()
  const [{ configs }] = useConfig()
  const [, { showToast }] = useToast()
  const { getCurrentLocation } = useLocation()
  const { maskOrderId } = useSecureOrderId()
  const [queue, setQueue] = useState<AlertQueue>(emptyQueue)
  const [arrival, setArrival] = useState(0)

  // An assign request is answered in the assign requests' tab, which the project may not have (then the alert has no button).
  const hasRequestsTab = !!configs?.logistic_module?.value && configs?.combine_pending_and_progress_orders?.value !== '1'
  const canOpenRequests = !!onOpenRequests || hasRequestsTab

  const gather = (kind: AlertKind, item: AlertItem) => {
    setQueue((previous) => addAlert(previous, kind, item))
    setArrival((count) => count + 1)
  }

  /**
   * Posts where the driver is, for an order that was just given to them. It predates the app's native location service
   * (`useDriverLocationTracking`), which now posts positions by itself, so it is redundant there; it stays as one more fix
   * for the server at the moment of the assignment, harmless: it is never waited for, and neither the position nor the post can
   * hold or drop the alert (each has its own time limit).
   */
  const reportLocation = async () => {
    if (!user?.id || !token) return
    try {
      const location: any = await withTimeout(getCurrentLocation(), LOCATION_POST_MS)
      const body = buildDriverLocationPostBody(location, user.id)
      if (!body) {
        showToast(ToastType.Error, t('ERROR_UPDATING_COORDS', 'Error updating coords'))
        return
      }
      const abort = new AbortController()
      const timer = setTimeout(() => abort.abort(), LOCATION_POST_MS)
      try {
        await fetch(`${ordering.root}/users/${user.id}/locations`, {
          method: 'POST',
          body: JSON.stringify(body),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          signal: abort.signal
        })
      } finally {
        clearTimeout(timer)
      }
    } catch { }
  }

  const handleEventNotification = (evtType: number, value: any, request = false) => {
    const isMessage = evtType === 1
    // A message of the chat that is on screen is read as it arrives: it needs no alert.
    if (isMessage && openChatOrderId() === Number(value?.order?.id ?? value?.order_id)) return
    // An order that is already this driver's (it carries them, or it was assigned to them on the spot) is not a
    // request to take it, even when it comes through a request event: its alert opens the order's details.
    let isDriversOrder = !!value?.driver && value.driver.id === user?.id
    let assignedOnTheSpot = false
    if (value?.driver && !isMessage) {
      // The alert is gathered below, now: the position is reported on the side.
      reportLocation()
      const assignedSecondsDiff = dayjs().diff(dayjs.utc(value?.last_driver_assigned_at), 'second', true)
      if (assignedSecondsDiff < 5 && !value?.logistic_status) {
        isDriversOrder = true
        assignedOnTheSpot = true
      }
    }
    // The author of the change is the driver: only an order assigned to them on the spot is told.
    if (value?.author_id === user?.id) {
      if (assignedOnTheSpot) gather('order', itemOf(value, false, false))
      return
    }
    const isRequest = request && !isDriversOrder
    gather(kindOf(evtType, isRequest), itemOf(value, isMessage, isRequest))
  }

  useEffect(() => {
    const handleEventTypeOne = (o: any) => {
      handleEventNotification(1, o)
    }
    const handleEventTypeTwo = (o: any) => {
      handleEventNotification(2, o)
    }
    const handleEventTypeThree = (o: any) => {
      handleEventNotification(3, o)
    }
    // The same alerts for a request to take an order (the logistic assignment): not the driver's order yet.
    const handleRequestRegistered = (o: any) => {
      handleEventNotification(2, o, true)
    }
    const handleRequestUpdated = (o: any) => {
      handleEventNotification(3, o, true)
    }

    events.on('message_added_notification', handleEventTypeOne)
    events.on('order_added_notification', handleEventTypeTwo)
    events.on('order_updated_notification', handleEventTypeThree)
    events.on('request_register_notification', handleRequestRegistered)
    events.on('request_update_notification', handleRequestUpdated)

    return () => {
      events.off('message_added_notification', handleEventTypeOne)
      events.off('order_added_notification', handleEventTypeTwo)
      events.off('order_updated_notification', handleEventTypeThree)
      events.off('request_register_notification', handleRequestRegistered)
      events.off('request_update_notification', handleRequestUpdated)
    }
  }, [orderStatus, events, user?.id, token])

  const opened = openAlert(queue)
  const content: AlertContent | null = opened ? alertContent(opened.kind, opened.items, t, maskOrderId, canOpenRequests) : null

  // Closing one kind's alert opens the next one (if any): it is a new arrival for the ears.
  const close = useCallback(() => {
    setQueue((previous) => closeAlert(previous))
    setArrival((count) => count + 1)
  }, [])

  const act = (action: AlertAction) => {
    close()
    switch (action.type) {
      // Opened the way a push notification opens an order: the details fetch it by its id.
      case 'details': return navigate('OrderDetails', { orderId: action.orderId, isDriverNotification: true, isFromRoot: true })
      case 'orders': return openOrdersTab('orders', action.status)
      case 'requests': return onOpenRequests ? onOpenRequests() : openOrdersTab('requests')
      case 'messages': return openMessagesTab()
    }
  }

  useEffect(() => {
    return () => setQueue(emptyQueue)
  }, [])

  return (
    <>
      {!!content && (
        <SoundPlayerComponent content={content} arrival={arrival} onClose={close} onAction={act} />
      )}
    </>
  )
};

/** The new-order alert: the headless controller (which gives the states the project notifies) and the alert as its UI. */
export const NewOrderNotification = (props: any) => (
  <NewOrderNotificationController {...props} UIComponent={NewOrderNotificationUI} />
)
