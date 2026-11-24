import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { useLanguage } from '@components'
import {
  Icon,
  OButton,
  OCard,
  ODivider,
  OLink,
  OText,
} from '../shared'
import { nativeShadowStyle, themeSpace } from '@/theme/helpers'
import { businessContacts, customerContacts, customerFullName } from '../OrderDetails/partyContact'
import { useOpenContact } from '../../hooks/useOpenContact'
import { usePhoneCountry } from '../../hooks/usePhoneCountry'

/** Which of the order's two parties the map is going to: the store, or the customer. */
export type MapParty = 'business' | 'customer'

/**
 * The stop the driver is going to, as a card floating over the bottom of the
 * order's map: who it is (the store to pick up at, the customer
 * to deliver to), its address, the distance and the travel time the map
 * measures, and what the driver does about it: "Show in other maps" and a call
 * to that party. While the order is offered (`offered`, the accept / reject bar
 * under the map) there is nothing to call yet: the card names the next stop
 * instead ("Then deliver to <address>") with "Other maps" at its end.
 *
 * It is the app's card over the map, so it carries the shadow of a floating
 * surface (`md`) in place of the card's resting one. The distance, the time and
 * the maps button are the caller's: it passes what its visibility keys
 * (`map.distance_bar`, `map.other_maps`) let through. The call button dials the
 * party's first phone under the rules of the order's details (`partyContact`:
 * the visibility keys of each party's phone, no store phone while the order is
 * still a request of the logistic assignment).
 */
interface Props {
  order: any
  party: MapParty
  /** The name of the marker, for a party whose name the order does not carry. */
  fallbackName?: string
  /** The distance, written with its unit; nothing when the theme hides it. */
  distance?: string | null
  /** The travel time, written as the app writes a duration; nothing without a trustworthy one. */
  time?: string | null
  /** Opens the sheet of maps apps; nothing when the theme hides "Show in other maps". */
  onOtherMaps?: () => void
  /** The order is offered: the card names the next stop and has no call button. */
  offered?: boolean
  logisticOrderStatus?: number[]
}

const cardStyles = (theme: any) => StyleSheet.create({
  // The floating surface's shadow (`map_marker.shadow`: it stands over the tiles, Identity does not take it away).
  card: { gap: themeSpace(theme, 'sm'), ...nativeShadowStyle(theme.native.components.map_marker.base.shadow) },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: themeSpace(theme, 'sm') },
  who: { flex: 1 },
  figures: { alignItems: 'flex-end' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: themeSpace(theme, 'sm') },
  grow: { flex: 1 },
  next: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
  nextText: { flex: 1 },
})

export const DestinationCard = ({ order, party, fallbackName, distance, time, onOtherMaps, offered = false, logisticOrderStatus }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const defaultCountry = usePhoneCountry()
  const styles = useMemo(() => cardStyles(theme), [theme])
  const slots = theme.native.components.order_details.slots

  const isStore = party === 'business'
  const openContact = useOpenContact()
  const name = (isStore ? order?.business?.name : customerFullName(order).trim()) || fallbackName
  const address = isStore ? order?.business?.address : order?.customer?.address
  // The stop after the store: the customer's address.
  const nextAddress = order?.customer?.address
  // As the stop card of the order's details: the party's first phone.
  const phones = isStore ? businessContacts(theme, order, logisticOrderStatus, defaultCountry).phones : customerContacts(theme, order, defaultCountry).phones
  const call = offered ? undefined : phones[0]

  return (
    <OCard style={styles.card} testID='driver-map-card'>
      <View style={styles.head}>
        <View style={styles.who}>
          <OText preset='body_sm' color='text_muted' testID='driver-map-card-label'>
            {isStore ? t('PICK_UP_AT', 'Pick up at') : t('DELIVER_TO', 'Deliver to')}
          </OText>
          <OText preset='h4' numberOfLines={2} testID='driver-map-card-name'>{name}</OText>
          {!!address && (
            <OText preset='body_sm' color='text_muted' numberOfLines={2} testID='driver-map-card-address'>{address}</OText>
          )}
        </View>
        {(!!distance || !!time) && (
          <View style={styles.figures}>
            {!!distance && <OText preset='h4' numberOfLines={1} testID='driver-map-distance'>{distance}</OText>}
            {!!time && <OText preset='body_sm' color='text_muted' numberOfLines={1} testID='driver-map-time'>{time}</OText>}
          </View>
        )}
      </View>
      {offered ? (
        (!!nextAddress || !!onOtherMaps) && (
          <>
            <ODivider />
            <View style={styles.next} testID='driver-map-card-next'>
              {nextAddress ? (
                <>
                  <Icon name='location-outline' color='text_muted' />
                  <OText preset='body_sm' style={styles.nextText}>
                    <OText preset='body_sm' color='text_muted'>{t('THEN_DELIVER_TO', 'Then deliver to')}</OText>
                    {` ${nextAddress}`}
                  </OText>
                </>
              ) : <View style={styles.nextText} />}
              {!!onOtherMaps && <OLink size='sm' shorcut={t('OTHER_MAPS', 'Other maps')} onPress={onOtherMaps} testID='driver-map-card-other-maps' />}
            </View>
          </>
        )
      ) : (!!onOtherMaps || !!call) && (
        <View style={styles.actions}>
          {!!onOtherMaps && (
            <View style={styles.grow}>
              {/* The screen's main action: the app's default button. */}
              <OButton
                icon={<Icon name='navigate-outline' />}
                text={t('SHOW_IN_OTHER_MAPS', 'Show in other maps')}
                onClick={onOtherMaps}
              />
            </View>
          )}
          {!!call && (
            <OButton
              iconOnly
              color={slots.stop_call.color}
              appearance={slots.stop_call.appearance}
              size={slots.stop_call.size}
              icon={<Icon name='call-outline' size='md' />}
              accessibilityLabel={isStore ? t('CALL_THE_STORE', 'Call the store') : t('CALL_THE_CUSTOMER', 'Call the customer')}
              onClick={() => openContact(call.url)}
            />
          )}
        </View>
      )}
    </OCard>
  )
}

export default DestinationCard
