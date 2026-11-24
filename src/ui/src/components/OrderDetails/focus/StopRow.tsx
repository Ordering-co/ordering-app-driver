import React, { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { focusStyles } from './styles'
import { FoldedRow } from './FoldedRow'
import { ContactRows, PartyAddress, type Party } from './PartyParts'
import { useStopDistance } from './useStopDistance'
import { businessContacts, customerContacts, customerFullName, deliveryOptionName } from '../partyContact'
import { Icon, OBadge, OText } from '../../shared'

import { useLanguage } from '@components'
import { usePhoneCountry } from '../../../hooks/usePhoneCountry'

/**
 * How the row calls its party: `then` is the customer after the pickup ("Then deliver to"), `done` a stop the
 * driver went through (a check, "Picked up at" / "Delivered to"), `neutral` the store or the customer of an
 * order that is over without being delivered, or whose customer is never a stop.
 */
export type StopRowMode = 'then' | 'done' | 'neutral'

interface Props {
  order: any
  party: Party
  mode: StopRowMode
  logisticOrderStatus?: number[]
  /** In a card that holds several rows: the row draws no card of its own. */
  boxed?: boolean
}

/**
 * The details of a party: every field the details write for it, under its conditions and visibility
 * keys (the address and its notes, the contacts, the internal number, the zip code, who the order is on behalf
 * of, the delivery option, the customer's rating and its distance from the store).
 */
const StopDetails = ({ order, party, logisticOrderStatus }: Pick<Props, 'order' | 'party' | 'logisticOrderStatus'>) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const defaultCountry = usePhoneCountry()
  const { fromStore } = useStopDistance()
  const styles = useMemo(() => focusStyles(theme), [theme])
  const isStore = party === 'business'
  const contacts = isStore ? businessContacts(theme, order, logisticOrderStatus, defaultCountry) : customerContacts(theme, order, defaultCountry)
  const links = [...contacts.phones, ...(contacts.email ? [contacts.email] : [])]
  const distance = isStore ? null : fromStore(order)
  const option = isStore ? null : deliveryOptionName(order, t)
  const rating = isStore ? null : order?.user_review?.qualification

  return (
    <>
      {!!rating && (
        <View style={styles.inline}>
          <Icon name='star' size='sm' color='text_muted' />
          <OText preset='body_sm'>{rating}</OText>
        </View>
      )}
      <PartyAddress order={order} party={party} />
      {!!distance && <OText preset='body_sm' color='text_muted'>{distance}</OText>}
      {(!!option || (!isStore && !!order?.on_behalf_of)) && (
        <View style={styles.spread}>
          {!!option && <OBadge variant='neutral' size='md' testID='focus-delivery-option'>{option}</OBadge>}
          {!isStore && !!order?.on_behalf_of && (
            <OText preset='body_sm' color='text_muted'>{t('ON_BEHALF_OF', 'On behalf of')}{': '}{order.on_behalf_of}</OText>
          )}
        </View>
      )}
      <ContactRows links={links} />
    </>
  )
}

/**
 * A stop that is not the current one: one folded row ("Then deliver to Ana Torres", "Picked up at Luna
 * Pizza"), which opens to the party's details.
 */
export const StopRow = ({ order, party, mode, logisticOrderStatus, boxed = true }: Props) => {
  const [, t] = useLanguage()
  const [open, setOpen] = useState(false)

  const isStore = party === 'business'
  const name = isStore ? order?.business?.name : customerFullName(order).trim()
  const address = isStore ? order?.business?.address : order?.customer?.address
  const label = mode === 'then'
    ? t('THEN_DELIVER_TO', 'Then deliver to')
    : mode === 'done'
      ? (isStore ? t('PICKED_UP_AT', 'Picked up at') : t('DELIVERED_TO', 'Delivered to'))
      : (isStore ? t('STORE', 'Store') : t('CUSTOMER', 'Customer'))

  const leading = mode === 'done'
    ? <Icon name='checkmark' color='success_text' />
    : <Icon name={isStore ? 'storefront-outline' : 'location-outline'} color='text_muted' />

  const header = mode === 'then'
    // The stop after this one: who and where, under its label.
    ? (
      <>
        <OText preset='body_sm' color='text_muted'>{label}</OText>
        <OText preset='label' numberOfLines={1}>{[name, address].filter(Boolean).join(' · ')}</OText>
      </>
    )
    : (
      <OText numberOfLines={1}>
        <OText color='text_muted'>{label}</OText>{' '}<OText preset='label'>{name}</OText>
      </OText>
    )

  return (
    <FoldedRow
      boxed={boxed}
      open={open}
      onToggle={() => setOpen(!open)}
      label={`${label} ${name ?? ''}`.trim()}
      leading={leading}
      header={header}
      body={<StopDetails order={order} party={party} logisticOrderStatus={logisticOrderStatus} />}
      testID={`focus-stop-row-${party}`}
    />
  )
}
