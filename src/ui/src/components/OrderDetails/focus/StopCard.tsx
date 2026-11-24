import React, { useMemo } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { focusStyles } from './styles'
import { PartyAddress, StopButtons, type Party } from './PartyParts'
import { useStopDistance } from './useStopDistance'
import { customerFullName, deliveryOptionName, stopContacts } from '../partyContact'
import { isAtStoreStatus } from '../orderStages'
import { Icon, OBadge, OCard, OText } from '../../shared'
import { useSecureOrderId } from '../../../hooks/useSecureOrderId'
import { usePhoneCountry } from '../../../hooks/usePhoneCountry'

import { useConfig, useLanguage } from '@components'

interface Props {
  order: any
  /** The stop: the store on the way to the pickup, the customer on the way to the delivery. */
  party: Party
  effectiveStatus: number
  logisticOrderStatus?: number[]
  driverPosition?: any
  onOpenMap: () => void
}

/**
 * The stop the driver is going to, the card at the top of the details in the `focus` layout: who and where it
 * is, how far from the driver (only with a real position), and its two buttons, Map and Call. At the store it
 * also says what to ask for: the order's number, and whom it is for.
 */
export const StopCard = ({ order, party, effectiveStatus, logisticOrderStatus, driverPosition, onOpenMap }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const defaultCountry = usePhoneCountry()
  const [{ configs }] = useConfig()
  const { orderNumberShort } = useSecureOrderId()
  const { fromDriver } = useStopDistance(driverPosition)
  const styles = useMemo(() => focusStyles(theme), [theme])

  const isStore = party === 'business'
  const place = order?.[party]
  // The first phone is the Call button's; the other phones and the e-mail are under "More details".
  const { call } = stopContacts(theme, order, party, logisticOrderStatus, defaultCountry)
  const distance = fromDriver(place?.location)
  const customerName = customerFullName(order).trim()
  const askFor = isStore && isAtStoreStatus(effectiveStatus)
  const option = isStore ? null : deliveryOptionName(order, t)
  const rating = !isStore ? order?.user_review?.qualification : null

  return (
    <OCard style={styles.card} testID={`focus-stop-${party}`}>
      <View style={styles.head}>
        <View style={styles.grow}>
          <OText preset='body_sm' color='text_muted'>{isStore ? t('PICK_UP_AT', 'Pick up at') : t('DELIVER_TO', 'Deliver to')}</OText>
          <OText preset='h4' numberOfLines={2}>{isStore ? place?.name : customerName}</OText>
        </View>
        {askFor && (
          <View style={styles.askFor} testID='focus-ask-for'>
            <OText preset='body_sm' color='text_muted'>{t('ASK_FOR', 'Ask for')}</OText>
            <OText preset='h2'>{orderNumberShort(order, configs?.change_order_id?.value === '1')}</OText>
          </View>
        )}
        {!!rating && (
          <View style={styles.inline}>
            <Icon name='star' size='sm' color='text_muted' />
            <OText preset='body_sm'>{rating}</OText>
          </View>
        )}
      </View>
      {askFor && !!customerName && (
        <OText preset='body_sm' color='text_muted'>{t('FOR_NAME', 'For :name:').replace(':name:', customerName)}</OText>
      )}
      <PartyAddress order={order} party={party} />
      {!isStore && !!order?.on_behalf_of && (
        <OText preset='body_sm' color='text_muted'>{t('ON_BEHALF_OF', 'On behalf of')}{': '}{order.on_behalf_of}</OText>
      )}
      {(!!option || !!distance) && (
        <View style={styles.spread}>
          {!!option && <OBadge variant='neutral' size='md' testID='focus-delivery-option'>{option}</OBadge>}
          {!!distance && (
            <View style={styles.time}>
              <Icon name='navigate-outline' size='sm' />
              <OText preset='body_sm'>{distance}</OText>
            </View>
          )}
        </View>
      )}
      <StopButtons call={call} onOpenMap={onOpenMap} />
    </OCard>
  )
}
