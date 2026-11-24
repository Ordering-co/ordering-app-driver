import React, { useContext, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { themePart } from '@/theme/helpers'
import { isLocationValidationActive } from '../../utils'
import { useStatusImage } from '../../hooks/useStatusImage'
import { useDeliveryPin } from '../../hooks/useDeliveryPin'
import { useOfflineActions } from '../../context/OfflineActions'
import { PermissionsContext } from '../../../../context/PermissionsContext'
import { isSheetAction } from '../AcceptOrRejectOrder/presentation'
import { queueStatusOffline } from '../AcceptOrRejectOrder/offlineChange'
import { OButton, useNotice } from '../shared'
import { orderActionsStyles } from './styles'
import { STATUS_OF_STEP, VIEW_OF_ACTION, type CardActions, type CardActionKey } from './cardActions'

import { ToastType, useConfig, useLanguage, useToast } from '@components'

interface Props {
  order: any
  /** The buttons the card offers this order (`cardActionsFor`, worked out by the card, which only draws this when there is one). */
  actions: CardActions
  /** The list's own request (`(status, ids, body?, options?)`, the one that loads the lists again after a change of the driver's own). */
  handleChangeOrderStatus?: (...args: any[]) => any
  /** The screen's accept view, a sheet over the list (`useAcceptSheet`). */
  openAcceptSheet?: (target: any) => void
  onNavigationRedirect?: (page: string, params?: any) => void
  /** Opens the order's details: the step whose location check only the details make. */
  onOpenOrder: () => void
  /** What a tap on a button that is off for lack of a connection says (one toast for the whole list). */
  onOfflineTap?: () => void
  activeOrdersCount?: number
}

/**
 * The quick actions of an order's card: the order's next step across the width and, where the step has one, the negative action
 * beside it, a third of the row. Nothing here is a path of its own: every button does what the same button of the order's bottom bar
 * does (`OrderDetails/Delivery.tsx`), with the same guards.
 *
 * - **Accept** is one tap, never held: it opens the accept sheet (time and position) unless the project hides the time
 *   (`hidden_driver_eta_time`), when it sets the status at once. **Reject**, **Pickup failed** and **Delivery failed** open their reason form.
 * - A **step** (arrived to the business, pickup complete, arrived to the customer, delivery complete) is a held button
 *   (`OButton hold`) when it fires by itself: the location permission granted and no photo, code or location check between the tap
 *   and the effect. A step that needs a photo, a delivery code or the location check opens the same sheet the details open; the
 *   arrival to the customer, whose check only the details make, opens the order.
 * - A change is one at a time per order (this card is busy while its own request runs; the other cards are not: a change of another
 *   order is a request of its own, and the list's reload queue waits for all of them), with the connection it needs: with no network and the offline queue on it
 *   is queued as one change of the order (`queueStatusOffline`), with the queue off the buttons stay painted off and a tap says why.
 *   A reload after the driver's own change is the list's request's (`OrdersOption`).
 * - Without the location permission a tap takes the driver to the permissions page, as the bar does.
 */
export const OrderCardActions = ({
  order,
  actions,
  handleChangeOrderStatus,
  openAcceptSheet,
  onNavigationRedirect,
  onOpenOrder,
  onOfflineTap,
  activeOrdersCount
}: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const [{ configs }] = useConfig()
  const [, { showToast }] = useToast()
  const notify = useNotice()
  const { isGrantedPermissions } = useContext(PermissionsContext)
  const [{ isNetConnected, canSaveChangesOffline }, { applyOffAction, registerOffOrder }] = useOfflineActions()
  const { requiresImage } = useStatusImage()
  const { requiresDeliveryPin } = useDeliveryPin()
  const styles = useMemo(() => orderActionsStyles(theme), [theme])
  const advanceSlot = themePart(theme, 'order_card', 'slots.advance')
  const declineSlot = themePart(theme, 'order_card', 'slots.decline')

  // One change of this order at a time: set before the first await, so a second tap meanwhile is turned away.
  const submittingRef = useRef(false)
  const [submitting, setSubmitting] = useState(false)

  if (!actions.advance && !actions.decline) return null

  const granted = !!isGrantedPermissions
  const hideTimer = configs?.hidden_driver_eta_time?.value === '1'
  const offline = isNetConnected !== null && !isNetConnected
  // The project does not save changes made offline: the steps wait for the network and say so when tapped.
  const disabledByInternet = offline && canSaveChangesOffline === false
  // Busy is this order's own change: the controller's flag for a change of any order (`loadingChangeOrder`) would paint every card off.
  const busy = submitting

  /** A step whose view (a photo, a delivery code or the location check) is a sheet over the list: the same sheet the details open. */
  const needsSheet = (key: CardActionKey) => {
    const status = STATUS_OF_STEP[key]
    if (!status) return false
    return requiresImage(status) || isLocationValidationActive(configs, status) || (key === 'deliveryComplete' && requiresDeliveryPin(order))
  }
  /** The arrival to the customer with a location check: the check is the details'. */
  const opensOrder = (key: CardActionKey) => key === 'arrivedToCustomer' && isLocationValidationActive(configs, 26)
  /** A step that fires by itself is held: nothing opens between the tap and its effect (decision of 2026-11-18). */
  const isHeld = (key: CardActionKey) => granted && !!STATUS_OF_STEP[key] && !needsSheet(key) && !opensOrder(key)

  /** The status change itself: the list's request, or the offline queue when there is no connection and the project keeps changes. */
  const runStep = async (status: number) => {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      if (offline && canSaveChangesOffline !== false) {
        // A queue that could not be written, or one that threw, says so: the driver must not think the change is waiting.
        const queued = await queueStatusOffline({ applyOffAction, registerOffOrder, ids: [order.id], orders: [order], status }).catch(() => false)
        if (!queued) showToast(ToastType.Error, t('THE_CHANGE_WAS_NOT_SAVED', 'The change was not saved. Try again.'))
      } else {
        await handleChangeOrderStatus?.(status, [order.id])
      }
    } catch {
      // The request words its failures (a toast); one that escapes is not a thing the card can show.
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  /** The accept / reject view of an action: a sheet over the list for the ones without a list of reasons, else its page. */
  const openView = (key: CardActionKey) => {
    const action = VIEW_OF_ACTION[key] as string
    const target = { action, order, ids: [order.id], activeOrdersCount, handleChangeOrderStatus }
    if (isSheetAction(action)) openAcceptSheet?.(target)
    else onNavigationRedirect?.('AcceptOrRejectOrder', target)
  }

  const run = (key: CardActionKey) => {
    if (submittingRef.current) return
    if (!granted) {
      onNavigationRedirect?.('RequestPermissions')
      return
    }
    if (key === 'reject' && configs?.allow_driver_reject_order?.value !== '1') {
      notify({
        title: t('WARNING', 'Warning'),
        message: t('DRIVER_NOT_ALLOWED_TO_REJECT_ORDER', 'The driver is not allowed to reject an order.')
      })
      return
    }
    if (opensOrder(key)) {
      onOpenOrder()
      return
    }
    // The accept that hides its time is the step to status 8; the others are a step or open their view.
    const status = key === 'accept' && hideTimer ? 8 : STATUS_OF_STEP[key]
    if (status && !needsSheet(key)) {
      runStep(status)
      return
    }
    openView(key)
  }

  const labels: Record<CardActionKey, string> = {
    accept: t('ACCEPT', 'Accept'),
    reject: t('REJECT', 'Reject'),
    arrivedToBusiness: t('ARRIVED_TO_BUSINESS', 'Arrived to business'),
    pickupComplete: t('PICKUP_COMPLETE', 'Pickup complete'),
    pickupFailed: t('PICKUP_FAILED', 'Pickup failed'),
    arrivedToCustomer: t('ARRIVED_TO_CUSTOMER', 'Arrived to customer'),
    deliveryComplete: t('DELIVERY_COMPLETE', 'Delivery complete'),
    deliveryFailed: t('DELIVERY_FAILED', 'Delivery failed')
  }

  const button = (key: CardActionKey, slot: any) => (
    <OButton
      fitText
      size={slot.size}
      appearance={slot.appearance}
      color={slot.color}
      text={labels[key]}
      hold={isHeld(key)}
      disabled={busy || disabledByInternet}
      onDisabledPress={disabledByInternet && !busy ? onOfflineTap : undefined}
      onClick={() => run(key)}
      testID={`order-card-${order.id}-${key}`}
    />
  )

  return (
    <View style={styles.row} testID={`order-card-${order.id}-actions`}>
      {!!actions.decline && <View style={styles.decline}>{button(actions.decline, declineSlot)}</View>}
      {!!actions.advance && <View style={actions.decline ? styles.advance : styles.alone}>{button(actions.advance, advanceSlot)}</View>}
    </View>
  )
}
