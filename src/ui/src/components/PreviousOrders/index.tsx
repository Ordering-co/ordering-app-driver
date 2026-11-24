import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useTheme } from 'styled-components/native';

import { ordersListStyles } from './styles';
import { themePart, themeVisible } from '@/theme/helpers';

import { OrdersGroupedItem } from './OrdersGroupedItem'
import { OrdersList } from './OrderList';
import { isGroupedOrderStatusInFlight } from './isGroupedOrderStatusInFlight';
import { useLogisticDeliveryTime } from '../../hooks/useLogisticDeliveryTime';
import { useDeliveryPin } from '../../hooks/useDeliveryPin';
import { useStatusImage } from '../../hooks/useStatusImage';
import { useNoConnectionHint } from '../../hooks/useNoConnectionHint';
import { useGroupStatusUpdate } from '../../hooks/useGroupStatusUpdate';
import { isLocationValidationActive } from '../../utils';
import { useStableCallback } from './useStableCallback';
import { isSheetAction } from '../AcceptOrRejectOrder/presentation';
import { useConfirm, OButton, OModal, OText } from '../shared';
import { queueStatusOffline } from '../AcceptOrRejectOrder/offlineChange';

import { useLanguage, useConfig, useToast, ToastType } from '@components';
import { useOfflineActions } from '../../context/OfflineActions'
import { AcceptOrRejectOrder } from '../AcceptOrRejectOrder'
import { ReviewCustomer } from '../ReviewCustomer'

/** A group is keyed by its `cart_group_id`: a blank key (or the text of a missing one) is no number to name. */
const hasGroupNumber = (groupId?: string | number | null) =>
  groupId != null && !['', 'null', 'undefined'].includes(String(groupId).trim())

export const PreviousOrders = (props: any) => {
  const {
    orders = [],
    onNavigationRedirect,
    getOrderStatus,
    handleClickOrder,
    isLogisticOrder,
    handleClickLogisticOrder,
    handleUpdateLogisticOrdersEta,
    openAcceptSheet,
    currentTabSelected,
    handleChangeOrderStatus,
    handleSendCustomerReview,
    loadingChangeOrder,
    regressionRequest,
    clearRegressionRequest,
    driverPosition
  } = props;

  let hash: any = {};
  const [, t] = useLanguage();
  const theme: any = useTheme();
  const styles = useMemo(() => ordersListStyles(theme), [theme]);
  // The actions of a row (`order_card.slots`): accept and reject tonal and small (decision D3); a step takes the brand color.
  const slots = themePart(theme, 'order_card', 'slots');
  const stepSlot = useMemo(() => ({ ...slots.accept, color: 'primary' }), [slots]);
  const [{ configs }] = useConfig();
  const [, { showToast }] = useToast();
  const [{ isNetConnected, canSaveChangesOffline }, { applyOffAction, registerOffOrder }] = useOfflineActions()
  const { requestDeliveryTime } = useLogisticDeliveryTime({ handleUpdateLogisticOrdersEta, openAcceptSheet })
  const { requiresDeliveryPin } = useDeliveryPin()
  const { requiresImage } = useStatusImage()
  const confirm = useConfirm()

  const [openModal, setOpenModal] = useState(false)
  const [openReviewModal, setOpenReviewModal] = useState<any>({ order: null, ids: [], customerId: null })
  const [orderUpdateStatus, setOrderUpdateStatus] = useState<any>({ action: '', ids: [], body: {}, order: {} })
  // The forced-status form is a view like the sheets: it closes when every order changed and stays, saying why, when not.
  const {
    update: updateForcedStatus,
    reset: resetForcedStatus,
    error: forcedStatusError,
    errorCodes: forcedStatusErrorCodes,
    retryAfter: forcedStatusRetryAfter
  } = useGroupStatusUpdate({
    ids: orderUpdateStatus.ids,
    orders: orderUpdateStatus.order?.id != null ? [orderUpdateStatus.order] : undefined,
    handleChangeOrderStatus,
    onSucceeded: () => setOpenModal(false)
  })
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  // One question at a time: the group's buttons turn off only once the change is sent, so a second tap in between would
  // queue a second dialog.
  const askingRef = useRef(false)
  const groupedStatusInFlight = isGroupedOrderStatusInFlight({
    loadingChangeOrder,
    submitting
  })

  useEffect(() => {
    if (!regressionRequest) return
    resetForcedStatus()
    setOrderUpdateStatus({ action: 'forceStatus', ids: regressionRequest.ids, body: regressionRequest.body, order: {} })
    setOpenModal(true)
    clearRegressionRequest?.()
  }, [regressionRequest])

  const pastOrderStatuses = [1, 2, 5, 6, 10, 11, 12, 16, 17]
  const deliveryTypes = [1, 7]
  const deliveryPickupBtn = props.appTitle?.text?.includes('Delivery') && [3, 8, 18]
  const deliveryStatusCompleteBtn = props.appTitle?.text?.includes('Delivery') && [9, 19, 23, 26]
  const isHideRejectButtons = configs?.reject_orders_enabled && configs?.reject_orders_enabled?.value !== '1'
  const isEnabledOrderNotReady = configs?.order_not_ready_enabled?.value === '1'
  const isEnabledFailedPickupDriver = configs?.failed_pickup_by_driver_enabled?.value === '1'
  // Offline is a connection known to be gone (not one still being read), the same test the card and the order's bar make.
  const offline = isNetConnected === false
  const disabledActionsByInternet = offline && canSaveChangesOffline === false

  // What a row calls is the latest of these (`useStableCallback`): the rows are memoized and a handler they kept would write a list
  // that is not the current one (see the file's note). The request's own screen also gets the latest one, not this render's.
  const latestClickLogisticOrder = useStableCallback(handleClickLogisticOrder)

  const handlePressOrder = (order: any) => {
    if (order?.locked && isLogisticOrder) return
    handleClickOrder && handleClickOrder(order)
    if (isLogisticOrder) {
      onNavigationRedirect &&
        onNavigationRedirect('OrderDetailsLogistic', { order: { ...order, isLogistic: isLogisticOrder }, handleClickLogisticOrder: handleClickLogisticOrder && latestClickLogisticOrder });
    } else {
      onNavigationRedirect &&
        onNavigationRedirect('OrderDetails', { order, activeOrdersCount: props.activeOrdersCount });
    }
  };

  const handleLogisticOrderAction = async (status: number, assignRequestId: any, orderParam?: any) => {
    const result = await handleClickLogisticOrder?.(status, assignRequestId, orderParam)
    if (status === 1) requestDeliveryTime(result)
    return result
  }

  // What a card's quick actions call (`OrderCardActions`): the latest of these as well, for the same reason. The driver's position (the
  // screen's: kept and read again when the list reloads, `useListDriverPosition`) is the card's distance to its stop, and the hint a tap on
  // a button that is off for lack of a connection shows is one for the whole list, so two taps in a row on two cards do not stack two toasts.
  const cardChangeStatus = useStableCallback(handleChangeOrderStatus)
  const cardOpenSheet = useStableCallback(openAcceptSheet)
  const cardRedirect = useStableCallback(onNavigationRedirect)
  const onOfflineTap = useNoConnectionHint()

  const pressOrder = useStableCallback(handlePressOrder)
  const logisticAction = useStableCallback(handleLogisticOrderAction)
  const statusText = useStableCallback(getOrderStatus)

  /**
   * Sends a group's status change and keeps its buttons off until the request is answered, whatever it does. With no connection
   * and the project saving changes for later it sends nothing: the change is queued as one per order, as the accept sheet and
   * the reason forms queue theirs (`queueStatusOffline`), and the orders are registered as they will be once it syncs.
   */
  const runGroupedStatusChange = async (status: number, ids: number[], group: any[] = []) => {
    if (isGroupedOrderStatusInFlight({
      loadingChangeOrder,
      submitting: submittingRef.current
    })) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      if (offline && canSaveChangesOffline !== false) {
        // A queue that could not be written, or one that threw, says so: the driver must not think the change is waiting.
        const queued = await queueStatusOffline({ applyOffAction, registerOffOrder, ids, orders: group, status }).catch(() => false)
        if (!queued) showToast(ToastType.Error, t('THE_CHANGE_WAS_NOT_SAVED', 'The change was not saved. Try again.'))
      } else {
        await handleChangeOrderStatus?.(status, ids)
      }
    } catch {
      // The controller words its failures (a toast) and answers them; one that escapes is not a thing this list can show.
    } finally {
      // Released by the answer, not by the controller's flag going up and down: with no order to change, or a request that
      // starts and ends within one render, that flag never shows a change and the buttons would stay off for good.
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const runGroupedNavigate = (callback: () => void) => {
    if (isGroupedOrderStatusInFlight({
      loadingChangeOrder,
      submitting: submittingRef.current
    })) return
    callback()
  }

  const closeForcedStatus = () => {
    resetForcedStatus()
    setOpenModal(false)
  }

  /** A button of a group's actions, off while a status change of the group is in flight. */
  const groupButton = (text: string, slot: any, onClick: () => void) => (
    <View key={text} style={styles.action}>
      <OButton
        text={text}
        size={slot.size}
        color={slot.color}
        appearance={slot.appearance}
        disabled={groupedStatusInFlight}
        onClick={onClick}
      />
    </View>
  )

  /**
   * A status change that hits every order of the group at once and has no form of its own asks first
   * (the accept button is named after the action): a stray tap would tell the business and the
   * customers of all of them something false. What opens a form (a reason, a code, a time) already is a step.
   */
  const confirmGroupChange = (text: string, count: number, groupId: string, run: () => void, destructive?: boolean) => {
    if (askingRef.current || isGroupedOrderStatusInFlight({ loadingChangeOrder, submitting: submittingRef.current })) return
    askingRef.current = true
    confirm({
      title: text,
      message: (hasGroupNumber(groupId)
        ? t('QUESTION_GROUP_ACTION', 'This changes the _count_ orders of group No. _group_ at once. Continue?').replace('_group_', String(groupId))
        // A group with no number keeps the question that names no group.
        : t('QUESTION_GROUP_ACTION_NO_NUMBER', 'This changes the _count_ orders of the group at once. Continue?')
      ).replace('_count_', String(count)),
      acceptText: text,
      destructive,
      onAccept: () => {
        askingRef.current = false
        run()
      },
      onCancel: () => { askingRef.current = false }
    })
  }

  /**
   * The actions of a group of orders, by the status of its first order.
   *
   * The list's request (`handleChangeOrderStatus`) sends a plain body to each order: it cannot carry a status photo, and it
   * does not check where the driver is. So a status that asks for a photo (`states_requiring_image_driver`) is not offered to a
   * group (the driver opens each order, whose own view takes the photo), and a step with a location check
   * (`location_validation_*`) opens the view that does the check before it sends, for the orders of the group, as a code does.
   */
  const groupActions = (group: any[], groupId: string) => {
    if (disabledActionsByInternet) return null
    const first = group[0]
    const ids = group.map((o: any) => o.id)
    // What the accept / reject view needs to speak for the whole group: its orders, to say how many and which, and its number.
    const openAction = (action: string, params: any = {}) => runGroupedNavigate(() => {
      const target = { action, order: first, ids, orders: group, groupId, ...params }
      // A sheet is presented over the orders list (the screen hosts it, see `useAcceptSheet`): a route would draw it over an
      // empty page. A reason form is a page.
      if (isSheetAction(action)) openAcceptSheet?.({ ...target, handleChangeOrderStatus })
      else onNavigationRedirect('AcceptOrRejectOrder', { ...target, handleChangeOrderStatus })
    })
    /** One row of the group's actions, as the buttons the first order's status offers (none is a row that is not drawn). */
    const actionRow = (key: string, buttons: React.ReactNode[], rows: React.ReactNode[]) => {
      if (buttons.some(Boolean)) rows.push(<View key={key} style={styles.actions}>{buttons}</View>)
    }
    /** A button that sets one status on every order of the group, after the driver has confirmed. */
    const groupStatusButton = (text: string, slot: any, status: number, destructive?: boolean) =>
      !requiresImage(status) && groupButton(text, slot, () => confirmGroupChange(text, group.length, groupId, () => runGroupedStatusChange(status, ids, group), destructive))
    /** A button that opens a form, unless the status asks for a photo, which the group's request cannot carry. */
    const groupFormButton = (text: string, slot: any, status: number, action: string) =>
      !requiresImage(status) && groupButton(text, slot, () => openAction(action))
    /** A step of the delivery: with a location check (or a delivery code) its sheet is the step, else a confirmation. */
    const groupStepButton = (text: string, slot: any, status: number, action: string, needsForm = false) =>
      isLocationValidationActive(configs, status) || needsForm
        ? groupFormButton(text, slot, status, action)
        : groupStatusButton(text, slot, status)
    const rows: React.ReactNode[] = []
    if (first?.status === 0) {
      actionRow('pending', [
        !isHideRejectButtons && groupFormButton(t('REJECT_ALL', 'Reject all'), slots.reject, 6, 'reject'),
        !requiresImage(8) && groupButton(t('ACCEPT_ALL', 'Accept all'), slots.accept, () => openAction('accept', { activeOrdersCount: props.activeOrdersCount }))
      ], rows)
    }
    if (first?.status === 7) {
      actionRow('ready', [groupStatusButton(t('READY_FOR_PICKUP', 'Ready for pickup'), stepSlot, 4)], rows)
    }
    if ((first?.status === 8 || first?.status === 18) && deliveryTypes?.includes(first?.delivery_type)) {
      actionRow('arrived', [groupStepButton(t('ARRIVED_TO_BUSINESS', 'Arrived to business'), stepSlot, 3, 'arrivedToBusiness')], rows)
    }
    if (first?.status === 4 && ![1].includes(first?.delivery_type)) {
      actionRow('customer-pickup', [
        !isHideRejectButtons && groupStatusButton(t('ORDER_NOT_PICKEDUP_BY_CUSTOMER', 'Order not picked up by customer'), slots.reject, 17, true),
        groupStatusButton(t('PICKUP_COMPLETED_BY_CUSTOMER', 'Pickup completed by customer'), slots.accept, 15)
      ], rows)
    }
    // The pickup's two outcomes come before "Order not ready", as the status steps of an order do.
    if (!!deliveryPickupBtn && deliveryPickupBtn?.includes(first?.status) && isEnabledFailedPickupDriver) {
      actionRow('pickup', [
        !isHideRejectButtons && isEnabledOrderNotReady && groupFormButton(t('PICKUP_FAILED', 'Pickup failed'), slots.reject, 10, 'pickupFailed'),
        groupStepButton(t('PICKUP_COMPLETE', 'Pickup complete'), slots.accept, 9, 'pickupComplete')
      ], rows)
    }
    if (first?.status === 3 && deliveryTypes?.includes(first?.delivery_type) && !isHideRejectButtons && isEnabledOrderNotReady) {
      actionRow('not-ready', [groupFormButton(t('ORDER_NOT_READY', 'Order not ready'), slots.reject, 14, 'notReady')], rows)
    }
    if (!!deliveryStatusCompleteBtn && deliveryStatusCompleteBtn.includes(first?.status)) {
      actionRow('delivery', [
        !isHideRejectButtons && groupFormButton(t('DELIVERY_FAILED', 'Delivery failed'), slots.reject, 12, 'deliveryFailed'),
        groupStepButton(t('DELIVERY_COMPLETE', 'Delivery complete'), slots.accept, 11, 'deliveryComplete', group.some(requiresDeliveryPin))
      ], rows)
    }
    return (
      <>
        {rows.length > 0 && (
          <OText preset='body_sm' color='text_muted' testID='orders-group-hint'>
            {t('FOR_THE_ORDERS_OF_THE_GROUP', 'For the _count_ orders of the group').replace('_count_', String(group.length))}
          </OText>
        )}
        {rows}
        {!first?.user_review && pastOrderStatuses.includes(first?.status) && themeVisible(theme, 'orders.review_order_button') && (
          <OButton
            text={t('REVIEW_CUSTOMER', 'Review customer')}
            size={slots.accept.size}
            onClick={() => setOpenReviewModal({
              order: first,
              customerId: first?.customer_id,
              ids
            })}
          />
        )}
      </>
    )
  }

  return (
    <>
      {orders && orders?.length > 0 && (
        <View style={styles.list}>
          {orders.map((_order: any) => {
            const order = !Array.isArray(_order) && (_order?.isLogistic && !_order?.order_group && isLogisticOrder ? _order?.order : _order)
            const _ordersGrouped = Array.isArray(_order) && Object.fromEntries(_order)
            if (!_ordersGrouped && !order) return null
            return (
              _ordersGrouped ? (
                <View key={_order[0]} style={styles.list}>
                  {Object.keys(_ordersGrouped).map((k, idx) => (
                    <OrdersGroupedItem
                      key={`${k}_${idx}`}
                      groupId={k}
                      orders={_ordersGrouped[k]}
                    >
                      {_ordersGrouped[k]?.length > 0 &&
                        _ordersGrouped[k]
                          ?.filter((order: any) => hash[order?.id] ? false : (hash[order?.id] = true))
                          ?.map((_order: any) => {
                            const order_ = _order?.isLogistic && !_order?.order_group && isLogisticOrder ? _order?.order : _order
                            if (!order_) return null
                            return (
                              <OrdersList
                                key={order_?.id}
                                order={order_}
                                _order={_order}
                                hideBtns
                                inGroup
                                isLogisticOrder={isLogisticOrder}
                                handlePressOrder={pressOrder}
                                currentTabSelected={currentTabSelected}
                                getOrderStatus={statusText}
                                handleClickLogisticOrder={logisticAction}
                                loadingChangeOrder={loadingChangeOrder}
                                activeOrdersCount={props.activeOrdersCount}
                                driverPosition={driverPosition}
                              />
                            )
                          })
                      }
                      {groupActions(_ordersGrouped[k], k)}
                    </OrdersGroupedItem>
                  ))}
                </View>
              ) : (
                <OrdersList
                  key={order.id}
                  order={order}
                  _order={_order}
                  isLogisticOrder={isLogisticOrder}
                  handlePressOrder={pressOrder}
                  currentTabSelected={currentTabSelected}
                  getOrderStatus={statusText}
                  handleClickLogisticOrder={logisticAction}
                  loadingChangeOrder={loadingChangeOrder}
                  activeOrdersCount={props.activeOrdersCount}
                  handleChangeOrderStatus={cardChangeStatus}
                  openAcceptSheet={cardOpenSheet}
                  onNavigationRedirect={cardRedirect}
                  onOfflineTap={onOfflineTap}
                  driverPosition={driverPosition}
                />
              )
            )
          })}
        </View>
      )}
      <OModal
        open={openModal}
        onClose={closeForcedStatus}
        entireModal
        customClose
      >
        <AcceptOrRejectOrder
          notShowCustomerPhone={false}
          appTitle={props.appTitle}
          customerCellphone={orderUpdateStatus.order?.customer?.cellphone}
          customerCountryPhoneCode={orderUpdateStatus.order?.customer?.country_phone_code}
          action={orderUpdateStatus.action}
          orderId={orderUpdateStatus.ids?.[0]}
          order={orderUpdateStatus.order}
          activeOrdersCount={props.activeOrdersCount}
          actions={props.actions}
          orderTitle={props.orderTitle}
          isLoadingOrder={loadingChangeOrder}
          pendingStatusBody={orderUpdateStatus.body}
          orderError={forcedStatusError}
          orderErrorCodes={forcedStatusErrorCodes}
          orderRetryAfter={forcedStatusRetryAfter}
          handleUpdateOrder={updateForcedStatus}
          closeModal={closeForcedStatus}
        />
      </OModal>
      <OModal
        open={!!openReviewModal?.order}
        onClose={() => setOpenReviewModal({ order: null, ids: [], customerId: null })}
        entireModal
        customClose
      >
        <ReviewCustomer
          order={openReviewModal?.order}
          closeModal={() => setOpenReviewModal({ order: null, ids: [], customerId: null })}
          onClose={() => setOpenReviewModal({ order: null, ids: [], customerId: null })}
          handleCustomCustomerReview={(body: any) => handleSendCustomerReview({
            onClose: setOpenReviewModal({ order: null, ids: [], customerId: null }),
            customerId: openReviewModal?.customerId,
            orderIds: openReviewModal?.ids,
            body
          })}
        />
      </OModal>
    </>
  );
};
