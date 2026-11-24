import React, { useMemo } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { focusStyles } from './styles'
import { StatusRow } from './StatusRow'
import { StopCard } from './StopCard'
import { StopRow } from './StopRow'
import { RouteCard } from './RouteCard'
import { FinishedStops } from './FinishedStops'
import { PaymentBlock } from './PaymentBlock'
import { CommentNotice, ProductsBlock } from './ProductsBlock'
import { FOCUS_BLOCK_ORDER, focusSituation, type FocusBlock } from './blockOrder'
import { CompletionNotice } from './CompletionNotice'
import { MoreDetails } from './MoreDetails'
import { DELIVERY_TYPES, stopStage } from '../orderStages'
import { OCard, SectionTitle } from '../../shared'
import { usePageSections } from '@/theme/sections'
import { useDriverOrderStage } from '../../../hooks/useDriverOrderStage'
import { useSecureOrderId } from '../../../hooks/useSecureOrderId'

interface Props {
  order: any
  logisticOrderStatus?: number[]
  /** Where the driver is (the location hook's position). */
  driverPosition?: any
  /** The screen's map (it checks the location permission). */
  onOpenMap: () => void
  /** The bottom bar offers "Delivery complete": say what it will ask for. */
  completeOffered?: boolean
  /** One order of a group: its blocks go in a card titled with its number. */
  isOrderGroup?: boolean
}

/**
 * One order's details in the `focus` layout, ordered around the stop the driver is going to: the status, then
 * the blocks in the order of the approved mockup of the order's stage (`FOCUS_BLOCK_ORDER`: the stop, or the
 * route, or the two finished stops; the other stop folded; the payment; the comment and the products; what
 * completing the delivery asks for), and the more details. The stage orders the blocks, not the theme's order
 * of sections, which only says what is shown. The status steps are all in the bottom bar.
 */
export const FocusOrder = ({ order, logisticOrderStatus, driverPosition, onOpenMap, completeOffered, isOrderGroup }: Props) => {
  const theme: any = useTheme()
  const { isVisible } = usePageSections('order_details')
  const { effectiveStatus } = useDriverOrderStage(order)
  const { orderNumberLabel } = useSecureOrderId()
  const styles = useMemo(() => focusStyles(theme), [theme])
  const details = theme.native.components.order_details

  const stage = stopStage(order, effectiveStatus)
  const showBusiness = isVisible('business')
  const showCustomer = isVisible('customer')
  // An order that is not a delivery has no "then deliver to": its customer is a plain row.
  const customerMode = DELIVERY_TYPES.includes(order?.delivery_type) ? 'then' : 'neutral'

  // The card of the current stop, or the route, or the two finished stops.
  const stop = stage === 'route'
    ? <RouteCard order={order} showBusiness={showBusiness} showCustomer={showCustomer} driverPosition={driverPosition} onOpenMap={onOpenMap} />
    : stage === 'finished'
      ? <FinishedStops order={order} showBusiness={showBusiness} showCustomer={showCustomer} logisticOrderStatus={logisticOrderStatus} />
      : stage === 'pickup'
        ? showBusiness && <StopCard order={order} party='business' effectiveStatus={effectiveStatus} logisticOrderStatus={logisticOrderStatus} driverPosition={driverPosition} onOpenMap={onOpenMap} />
        : showCustomer && <StopCard order={order} party='customer' effectiveStatus={effectiveStatus} logisticOrderStatus={logisticOrderStatus} driverPosition={driverPosition} onOpenMap={onOpenMap} />
  // The stop that is not the current one, folded: the customer after the pickup, the store after it.
  const other = stage === 'pickup'
    ? showCustomer && <StopRow order={order} party='customer' mode={customerMode} logisticOrderStatus={logisticOrderStatus} />
    : stage === 'delivery' && showBusiness && <StopRow order={order} party='business' mode='done' logisticOrderStatus={logisticOrderStatus} />

  // The route's facts card already says the total and the payment: its bill is one of the "More details".
  const showBill = isVisible('bill') && stage === 'route'
  const showPayment = isVisible('bill') && stage !== 'route'
  // The card of the current stop keeps its first phone: its other contacts are listed under "More details".
  const stopParty = stage === 'pickup' && showBusiness ? 'business' : stage === 'delivery' && showCustomer ? 'customer' : null

  const drawn: Record<FocusBlock, React.ReactNode> = {
    stop,
    other,
    payment: showPayment && <PaymentBlock order={order} stage={stage} effectiveStatus={effectiveStatus} />,
    comment: isVisible('products') && <CommentNotice order={order} />,
    products: isVisible('products') && <ProductsBlock order={order} effectiveStatus={effectiveStatus} />,
    completion: !!completeOffered && effectiveStatus === 26 && <CompletionNotice order={order} />
  }

  const blocks = (
    <View style={styles.order} testID='focus-order'>
      {isVisible('header') && <StatusRow order={order} logisticOrderStatus={logisticOrderStatus} />}
      {/* Keyed by block: a block that moves (the stage changes) keeps its state, as the products row keeps open or folded. */}
      {FOCUS_BLOCK_ORDER[focusSituation(stage, effectiveStatus)].map((block) => (
        <React.Fragment key={block}>{drawn[block]}</React.Fragment>
      ))}
      <MoreDetails order={order} logisticOrderStatus={logisticOrderStatus} stopParty={stopParty} showBill={showBill} />
    </View>
  )

  if (!isOrderGroup) return blocks
  return (
    <OCard style={styles.group}>
      <SectionTitle text={details.base.address_title}>{orderNumberLabel(order)}</SectionTitle>
      {blocks}
    </OCard>
  )
}
