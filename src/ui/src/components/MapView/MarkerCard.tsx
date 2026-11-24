import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { OButton, OCard, OText } from '../shared'
import { ModalCloseButton, closeButtonInset } from '../shared/styles'
import { useSecureOrderId } from '../../hooks/useSecureOrderId'
import { nativeShadowStyle, themeSpace } from '@/theme/helpers'

/**
 * What the Map tab's card names: a marker's store or customer, and the orders at it (`orderIds`, the
 * ids as the API sends them). The card reads the marker's own data (the first order of its group).
 */
export type MarkerSelection = { marker: any, customer: boolean, orderIds: Array<number | string> }

interface Props {
  selection: MarkerSelection
  onClose: () => void
  /** "More info" (one order) opens it; "Show orders" (several) opens the orders list: the caller knows how. */
  onOpen: () => void
}

const cardStyles = (theme: any) => StyleSheet.create({
  // The floating surface's shadow (`map_marker.shadow`: it stands over the tiles, Identity does not take it away).
  card: { gap: themeSpace(theme, 'sm'), ...nativeShadowStyle(theme.native.components.map_marker.base.shadow) },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: themeSpace(theme, 'sm') },
  who: { flex: 1 },
  // The close button's glyph, not its touch box, sits at the card's corner.
  close: { marginTop: -closeButtonInset(theme), marginRight: -closeButtonInset(theme) },
})

/**
 * The card at the bottom of the Map tab when a marker is tapped (in place of the map library's callout
 * bubble): what the marker is (the store to pick up at, the customer to deliver to) with the order's
 * number, or the numbers of its orders, the name, the address and what else the marker knows of the
 * place (the city or the address notes, the zip code, the customer's internal number), a close button
 * and the button that opens the order ("More info"), or the orders list when the marker has several
 * ("Show orders"). The order numbers are the app's one label, masked in a secure project.
 */
export const MarkerCard = ({ selection, onClose, onOpen }: Props) => {
  const { marker, customer, orderIds } = selection
  const theme: any = useTheme()
  const styles = useMemo(() => cardStyles(theme), [theme])
  const [, t] = useLanguage()
  const { maskOrderId, orderNumberLabel } = useSecureOrderId()

  const hasManyOrders = orderIds.length > 1
  const orderNumbers = hasManyOrders
    ? `${t('ORDER_NUMBERS', 'Order Numbers')} ${orderIds.map((id) => maskOrderId(id)).join(', ')}`
    : orderNumberLabel(marker?.id)
  const party = customer ? marker?.customer : marker?.business
  const name = customer ? [party?.name, party?.lastname].filter(Boolean).join(' ') : party?.name
  // After the address: the store's city or the customer's address notes, the zip code and the customer's internal number.
  const details = [customer ? party?.city?.address_notes : party?.city?.name, party?.zipcode, customer ? party?.internal_number : undefined]
    .filter(Boolean).join(' · ')

  return (
    <OCard style={styles.card} testID='map-card'>
      <View style={styles.head}>
        <View style={styles.who}>
          <OText preset='body_sm' color='text_muted' numberOfLines={2} testID='map-card-orders'>
            {`${customer ? t('DELIVER_TO', 'Deliver to') : t('PICK_UP_AT', 'Pick up at')} · ${orderNumbers}`}
          </OText>
          <OText preset='h4' numberOfLines={2} testID='map-card-name'>{name}</OText>
          {!!party?.address && <OText preset='body_sm' color='text_muted' numberOfLines={2} testID='map-card-address'>{party.address}</OText>}
          {!!details && <OText preset='body_sm' color='text_muted' numberOfLines={2} testID='map-card-details'>{details}</OText>}
        </View>
        <ModalCloseButton onPress={onClose} iconSize='md' style={styles.close} testID='map-card-close' />
      </View>
      <OButton
        text={hasManyOrders ? t('SHOW_ORDERS', 'Show orders') : t('MORE_INFO', 'More info')}
        onClick={onOpen}
        testID='map-card-open'
      />
    </OCard>
  )
}

export default MarkerCard
