import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from 'styled-components/native';

import { orderCardStyles, positionDialogStyles } from './styles'
import { themePart, themeVisible } from '@/theme/helpers'

import { useLanguage, useUtils, useConfig, useEvent, useApi, useSession } from '@components';
import { FilterChip, Icon, OAvatar, OBadge, OButton, OCard, OModal, OStepper, OText } from '../shared'
import { orderTypeVariant } from '../shared/orderTypeVariant'
import { groupLabel, joinTitle, orderNumberTag, orderTypeLabel } from '../../utils'
import { useSecureOrderId } from '../../hooks/useSecureOrderId'
import { useDriverOrderStage } from '../../hooks/useDriverOrderStage'
import { useOrderPayment } from '../../hooks/useOrderPayment'
import { customerFullName } from '../OrderDetails/partyContact'
import { useStopDistance } from '../OrderDetails/focus/useStopDistance'
import { nextStop } from './nextStop'
import { orderCardPieces } from './orderCardPieces'
import { itemsText, paymentChip } from './orderCardData'
import { closedOrderTime, openOrderTime, showsClockTime } from './orderCardTime'
import { OrderCardHeader, OrderCardStop, OrderChips, OrderStatusBand } from './OrderCardParts'
import { bandTone } from './orderCardBand'
import { OrderCardActions } from './OrderCardActions'
import { cardActionsFor, type CardActions } from './cardActions'
import { isOrderQueued } from '../../context/OfflineActions/offlineActionsQueue'

import { useOfflineActions } from '../../context/OfflineActions'

/**
 * An order of the list, in the three places it has: a card of its own, the card of an assign request (the actions the caller passes
 * as `children`) and an order of a group's card (`inGroup`: the same card, without quick actions, in the group's card).
 *
 * The card, top to bottom: the status band (edge to edge: the order's status at its start and its time at its end, "24 min left",
 * "12 min late", or for an order that is over the clock time and day it ended, in the tint of the time's state or of how it ended);
 * the header (the store's logo, its name over "#number · customer", the order's total at the end); the next stop's line with the
 * driver's distance; the chips (the delivery position or the order type, in the type's colour, Collect cash or Paid, the items); the
 * quick actions. What the payload does not carry is left out, and so is what the theme hides (`orders.*`).
 *
 * Not memoized on its own: `OrdersList` (its only parent) is, and the actions it passes as `children` are drawn from props
 * and config that only it reads. A second gate with the same comparator would hold the children of the last render the order
 * changed in, so an action that depends on the config (the reject, hidden by it) would not follow the config.
 */
export const OrderItem = (props: any) => {
  const {
    order,
    _order,
    isLogisticOrder,
    currentTabSelected,
    getOrderStatus,
    handlePressOrder,
    activeOrdersCount,
    inGroup,
    handleChangeOrderStatus,
    openAcceptSheet,
    onNavigationRedirect,
    onOfflineTap,
    driverPosition,
    children
  } = props

  const theme: any = useTheme()
  const [, t] = useLanguage()
  const [events] = useEvent()
  const [configState] = useConfig()
  const [ordering] = useApi()
  const [{ token }] = useSession()
  const [utils] = useUtils();
  const { effectiveStatus, isPickupPhase } = useDriverOrderStage(order)
  const payment = useOrderPayment(order)
  const { distanceFromDriver } = useStopDistance(driverPosition)
  const { maskOrderId, orderNumberLabel } = useSecureOrderId()
  const styles = useMemo(() => orderCardStyles(theme), [theme])
  const dialog = useMemo(() => positionDialogStyles(theme), [theme])

  // The cloud of an order that waits for its sync is the queue's to decide (`isOrderQueued`): while it holds a change for the order.
  const [{ actions: queuedChanges }] = useOfflineActions()
  const [showPriorityModal, setShowPriorityModal] = useState(false)
  const [newPosition, setNewPosition] = useState<number | null>(null)
  const [savingPosition, setSavingPosition] = useState(false)

  const maxPosition = activeOrdersCount != null ? activeOrdersCount : null
  const onTheWayToCustomerStatuses = [23]
  const isDeliveryPositionLocked = onTheWayToCustomerStatuses.includes(order?.status)
  const pieces = orderCardPieces(currentTabSelected, configState?.configs, !!isLogisticOrder)
  const canEditDeliveryPosition = pieces.position

  const openPriorityModal = () => {
    if (isDeliveryPositionLocked) return
    setNewPosition(order?.delivery_position ?? 1)
    setShowPriorityModal(true)
  }

  const handleUpdateDeliveryPosition = async () => {
    if (newPosition === null) return
    try {
      setSavingPosition(true)
      const response = await fetch(`${ordering.root}/orders/${order?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-APP-X': ordering.appId,
          ...(ordering.appInternalName && { 'X-INTERNAL-PRODUCT-X': ordering.appInternalName }),
        },
        body: JSON.stringify({ delivery_position: newPosition }),
      })
      const { error } = await response.json()
      if (error) {
        console.error('Error updating delivery position:', error)
      } else {
        setShowPriorityModal(false)
        events.emit('delivery_position_updated')
      }
    } catch (e) {
      console.error('Error updating delivery position:', e)
    } finally {
      setSavingPosition(false)
    }
  }
  const showExternalId = configState?.configs?.change_order_id?.value === '1'

  const isUnsync = isOrderQueued(queuedChanges, order?.id)
  const isLocked = !!order?.locked && !!isLogisticOrder

  const showLogo = themeVisible(theme, 'orders.business_logo')
  const showName = themeVisible(theme, 'orders.business_name')
  const showNumber = themeVisible(theme, 'orders.order_number')
  const showDate = themeVisible(theme, 'orders.date')
  const showType = themeVisible(theme, 'orders.order_type')
  const showStatus = themeVisible(theme, 'orders.order_status')
  const showQuickActions = themeVisible(theme, 'orders.quick_actions')
  const showClockTime = showsClockTime(theme)
  // The total is the details' own (`confirmation.order.total`): a project that hides it from the driver does not leak it into the list.
  const showTotal = themeVisible(theme, 'confirmation.order.total')

  // The quick actions the order's stage has (the card's footer: beside the pressable, see `OCard`), none in a group or an assign request.
  const quick: CardActions = !inGroup && !isLogisticOrder && showQuickActions
    ? cardActionsFor({ order, effectiveStatus, isPickupPhase, configs: configState?.configs, project: ordering?.project })
    : {}
  const hasQuick = !!quick.advance || !!quick.decline

  const press = () => handlePressOrder({
    ...order,
    logistic_order_id: _order?.id,
    unsync: isUnsync
  })

  // The time at the band's end: what an open order has left (the tabs of open orders, on the enterprise plan) or the clock time an
  // order that is over ended or was due (the theme's `orders.date` hides it).
  const time = pieces.timer
    ? openOrderTime(order, utils, t, showClockTime)
    : pieces.closedTime && showDate ? closedOrderTime(order, utils, t) : null

  const stop = !isLogisticOrder ? nextStop(order, effectiveStatus) : null
  const distance = stop ? distanceFromDriver(order?.[stop.party]?.location) : null
  const stopText = stop && `${stop.party === 'business' ? t('PICK_UP_AT', 'Pick up at') : t('DELIVER_TO', 'Deliver to')} ${stop.address}`

  const isLogisticGroup = !!order?.order_group_id && !!order?.order_group && !!isLogisticOrder
  const shownId = showExternalId && order?.external_id ? order.external_id : maskOrderId(order?.id)
  const number = showNumber ? orderNumberTag(shownId) : ''
  const customer = customerFullName(order).trim()
  // An assign request of a group is the group (its orders are in its details): the group's number and how many orders it has.
  const title = isLogisticGroup
    ? joinTitle([groupLabel(t, order?.order_group_id), `${order?.order_group?.orders?.length} ${t('ORDERS', 'Orders')}`])
    : joinTitle([number, customer])
  // A standalone order of a group (the rest of the group is in another tab) says which group it is.
  const groupName = !isLogisticOrder && !inGroup && !!order?.order_group_id ? groupLabel(t, order?.order_group_id) : ''
  const storeName = joinTitle([groupName, showName ? order.business?.name : ''])

  const syncIcon = isUnsync && <Icon set='mci' name='cloud-sync' size='sm' color='text_muted' testID='order-card-unsync' />
  const unreadDot = !!order?.showNotification && <Icon set='mci' name='circle-medium' color='primary' testID='order-card-unread' />
  const marks = (isUnsync || !!order?.showNotification) ? <>{syncIcon}{unreadDot}</> : undefined

  const logo = showLogo && (
    isLocked
      ? <View style={styles.tile}><Icon name='lock-closed-outline' color='text_muted' testID='order-card-lock' /></View>
      : (
        <OAvatar
          kind='business'
          size='md'
          source={order.business?.logo?.includes('https') ? order.business.logo : null}
          testID='order-card-logo'
        />
      )
  )

  const hasTotal = (order?.summary?.total ?? order?.total) != null
  const total = showTotal && hasTotal ? payment.total : undefined

  // The status band: the status (`orders.order_status`) and the time, in the tone of the time's state (an order that is over: of how it
  // ended). None of the two draws no band; an assign request has neither.
  const statusText = showStatus && !isLogisticOrder && order.status != null ? getOrderStatus(order.status) : undefined
  const tone = bandTone({ closed: pieces.closedTime, status: order.status, time })

  // The delivery position as "Delivery #N" (a pill in the order type's colour), else the order type's chip in the same colour; with no
  // position yet and the project ordering by position, the setter beside the type. `orders.order_type` hides both.
  const typeVariant = orderTypeVariant(order.delivery_type)
  const hasPosition = canEditDeliveryPosition && order?.delivery_position != null
  const lead = showType && !isLogisticOrder && (
    <>
      {hasPosition && (
        <OBadge
          variant={typeVariant}
          style={styles.chip}
          onPress={openPriorityModal}
          disabled={isDeliveryPositionLocked}
          accessibilityLabel={`${t('DELIVERY_POSITION', 'Delivery position')} ${order?.delivery_position}`}
          testID='order-card-position'
        >
          {`${t('DELIVERY_NUMBER', 'Delivery')} #${order?.delivery_position}`}
        </OBadge>
      )}
      {canEditDeliveryPosition && order?.delivery_position == null && (
        <FilterChip
          size='sm'
          icon='format-list-numbered'
          iconSet='mci'
          onPress={openPriorityModal}
          disabled={isDeliveryPositionLocked}
          accessibilityLabel={t('DELIVERY_POSITION', 'Delivery position')}
          testID='order-card-position'
        />
      )}
      {!hasPosition && (
        <OBadge variant={typeVariant} style={styles.chip} testID='order-card-type'>{orderTypeLabel(t, order.delivery_type)}</OBadge>
      )}
    </>
  )

  const positionDialog = canEditDeliveryPosition && showPriorityModal && (
    // Mounted only while open: a list of cards does not carry a dialog each.
    <OModal
      open={showPriorityModal}
      onClose={() => setShowPriorityModal(false)}
      isTransparent
      box
      title={t('DELIVERY_POSITION', 'Delivery position')}
      testID='order-position-dialog'
    >
      <View style={dialog.content}>
        <OText preset='body_sm' color='text_muted'>
          {orderNumberLabel(order)}
        </OText>
        <OStepper
          size='lg'
          value={newPosition ?? 1}
          min={1}
          max={maxPosition ?? undefined}
          onChange={setNewPosition}
          testID='order-position-stepper'
        />
      </View>
      <View style={dialog.actions}>
        <View style={dialog.action}>
          <OButton
            text={t('CANCEL', 'Cancel')}
            color='neutral'
            appearance='outline'
            onClick={() => setShowPriorityModal(false)}
          />
        </View>
        <View style={dialog.action}>
          <OButton
            text={t('SAVE', 'Save')}
            loading={savingPosition}
            disabled={newPosition === null}
            onClick={() => handleUpdateDeliveryPosition()}
          />
        </View>
      </View>
    </OModal>
  )

  return (
    <>
      <OCard
        look={themePart(theme, 'order_card', 'base')}
        style={isLocked ? styles.locked : undefined}
        onPress={isLocked ? undefined : press}
        // The buttons are the card's footer, outside its press: a touch on a button is the button's alone (see `OCard`).
        footer={hasQuick
          ? (
            <OrderCardActions
              order={order}
              actions={quick}
              handleChangeOrderStatus={handleChangeOrderStatus}
              openAcceptSheet={openAcceptSheet}
              onNavigationRedirect={onNavigationRedirect}
              onOpenOrder={press}
              onOfflineTap={onOfflineTap}
              activeOrdersCount={activeOrdersCount}
            />
          )
          : isLogisticOrder && !!children ? children : undefined}
        accessibilityLabel={isLogisticOrder ? order.business?.name : undefined}
        testID={`order-card-${order.id}`}
      >
        <OrderStatusBand status={statusText} time={time?.text} tone={tone} theme={theme} styles={styles} />
        <View style={styles.body}>
          <OrderCardHeader
            logo={logo || undefined}
            storeName={storeName}
            title={title}
            muted={isLocked}
            lockedStyle={styles.lockedName}
            marks={marks}
            total={total}
            styles={styles}
          />
          {isLocked && (
            <OText style={styles.meta} numberOfLines={2} testID='order-card-locked'>
              {t('ASSIGN_REQUEST_LOCKED', 'Locked while another request is open')}
            </OText>
          )}
          {!!stop && !!stopText && <OrderCardStop party={stop.party} text={stopText} distance={distance} styles={styles} />}
          <OrderChips
            lead={lead || undefined}
            payment={paymentChip(order, payment.isCashOnly)}
            collectText={t('COLLECT_IN_CASH', 'Collect in cash')}
            paidText={t('PAID', 'Paid')}
            items={itemsText(order, t)}
            styles={styles}
          />
        </View>
      </OCard>
      {positionDialog}
    </>
  )
}
