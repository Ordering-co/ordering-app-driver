import React, { useMemo } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { focusStyles } from './styles'
import { useOpenContact } from '../../../hooks/useOpenContact'
import { mapsUrl, type ContactLink } from '../partyContact'
import { themeVisible } from '@/theme/helpers'
import { Icon, OButton, OLink, OText } from '../../shared'

import { useLanguage } from '@components'

export type Party = 'business' | 'customer'

/** The line of small facts of the customer's place: its internal number, zip code and address notes. */
export const customerPlaceLine = (order: any) =>
  [order?.customer?.internal_number, order?.customer?.zipcode, order?.customer?.address_notes].filter(Boolean).join(' · ')

/** The party's address as a maps link, with its notes (the store's) or its place line (the customer's) under it. */
export const PartyAddress = ({ order, party }: { order: any, party: Party }) => {
  const place = order?.[party]
  const note = party === 'business' ? place?.address_notes : customerPlaceLine(order)
  return (
    <>
      {!!place?.address && <OLink url={mapsUrl(place.address, place.location)} shorcut={place.address} numberOfLines={2} />}
      {!!note && <OText preset='body_sm' color='text_muted'>{note}</OText>}
    </>
  )
}

/** The contact links of a party, one touch target each: its phones and its e-mail, opened as the Call button opens its phone. */
export const ContactRows = ({ links }: { links: ContactLink[] }) => {
  const theme: any = useTheme()
  const styles = useMemo(() => focusStyles(theme), [theme])
  const openContact = useOpenContact()
  const detailIcon = theme.native.components.order_details.base.detail_icon_size
  return (
    <>
      {links.map((link) => (
        <View key={link.key} style={styles.contact}>
          <Icon name={link.key === 'email' ? 'mail-outline' : 'call-outline'} size={detailIcon} color='primary_text' />
          <OLink onPress={() => openContact(link.url)} shorcut={link.text} />
        </View>
      ))}
    </>
  )
}

/**
 * The stop card's two buttons, always in the same place: "Map" (`confirmation.order.directions`, the screen's
 * map) and "Call" (the party's first phone, when the theme shows phones). Each is the theme's slot.
 */
export const StopButtons = ({ call, onOpenMap }: { call?: ContactLink, onOpenMap: () => void }) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const styles = useMemo(() => focusStyles(theme), [theme])
  const openContact = useOpenContact()
  const { stop_map: map, stop_call: dial } = theme.native.components.order_details.slots
  const showMap = themeVisible(theme, 'confirmation.order.directions')
  if (!showMap && !call) return null
  return (
    <View style={styles.buttons}>
      {showMap && (
        <View style={styles.button}>
          <OButton
            color={map.color}
            appearance={map.appearance}
            size={map.size}
            icon={<Icon name='navigate-outline' />}
            text={t('MAP', 'Map')}
            onClick={onOpenMap}
          />
        </View>
      )}
      {!!call && (
        <View style={styles.button}>
          <OButton
            color={dial.color}
            appearance={dial.appearance}
            size={dial.size}
            icon={<Icon name='call-outline' />}
            text={t('CALL', 'Call')}
            onClick={() => openContact(call.url)}
          />
        </View>
      )}
    </View>
  )
}
