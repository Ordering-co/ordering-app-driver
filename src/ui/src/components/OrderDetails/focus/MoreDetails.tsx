import React, { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { focusStyles } from './styles'
import { FoldedRow } from './FoldedRow'
import { useOrderDataLines, useOrderDeliveryDate } from '../orderData'
import { hasSpotOrVehicle, orderCustomFields, orderVehicleLines } from '../OrderVehicle'
import { OrderBill } from '../OrderBill'
import { customerFullName, stopContacts } from '../partyContact'
import { ContactRows, type Party } from './PartyParts'
import { orderTypeLabel } from '../../../utils'
import { themeVisible } from '@/theme/helpers'
import { OText } from '../../shared'
import { usePageSections } from '@/theme/sections'

import { useLanguage } from '@components'
import { usePhoneCountry } from '../../../hooks/usePhoneCountry'

/** The order's data lines in the order of the details. */
const DATA_ORDER = ['external_id', 'created_at', 'spot', 'reservation']

const DetailLine = ({ label, value }: { label: string, value: React.ReactNode }) => {
  const theme: any = useTheme()
  const styles = useMemo(() => focusStyles(theme), [theme])
  return (
    <View style={styles.line}>
      <OText preset='body_sm' color='text_muted' style={styles.lineLabel}>{label}</OText>
      <OText preset='body_sm' align='right' style={styles.lineLabel}>{value}</OText>
    </View>
  )
}

interface Props {
  order: any
  logisticOrderStatus?: number[]
  /** The party of the current stop's card: its other phones and its e-mail are listed here. */
  stopParty?: Party | null
  /** The bill is listed here: the payment row is not drawn. */
  showBill?: boolean
}

/**
 * What the order carries besides what the driver acts on, one folded row: its type, when it is for in full, its
 * external id, when it was created, its spot and reservation, then its custom fields and its vehicle (page
 * sections `custom_fields` and `vehicle`), each under the conditions it has always had. Two things come here
 * only when the screen has taken them off its face: the other phones and the e-mail of the current stop (its
 * card keeps the name, the address, "Map" and "Call"), and the whole bill of an order that is only offered (its
 * facts card already says the total and the payment). Nothing when the order has none of them.
 */
export const MoreDetails = ({ order, logisticOrderStatus, stopParty = null, showBill = false }: Props) => {
  const theme: any = useTheme()
  const styles = useMemo(() => focusStyles(theme), [theme])
  const [, t] = useLanguage()
  const defaultCountry = usePhoneCountry()
  const { isVisible } = usePageSections('order_details')
  const date = useOrderDeliveryDate(order)
  const dataLines = useOrderDataLines(order, logisticOrderStatus)
  const [open, setOpen] = useState(false)

  const fields = isVisible('custom_fields') ? orderCustomFields(order) : []
  const { spot, vehicle, vehicleTitle } = orderVehicleLines(order, t)
  // The spot is one line already when the order's data has it: the vehicle block does not repeat it.
  const spotLine = dataLines.some((line) => line.key === 'spot') ? null : spot
  const showVehicle = isVisible('vehicle') && hasSpotOrVehicle(order) && (!!spotLine || !!vehicle)

  const contacts = stopParty ? stopContacts(theme, order, stopParty, logisticOrderStatus, defaultCountry).links : []
  const contactsTitle = stopParty === 'business' ? order?.business?.name : customerFullName(order).trim()

  const lines = [
    themeVisible(theme, 'confirmation.order.type') && { key: 'type', label: t('ORDER_TYPE', 'Order Type'), value: orderTypeLabel(t, order?.delivery_type) as React.ReactNode },
    themeVisible(theme, 'confirmation.order.eta') && { key: 'placed', label: t('PLACED_TO', 'Placed to'), value: date.full as React.ReactNode },
    ...[...dataLines].sort((a, b) => DATA_ORDER.indexOf(a.key) - DATA_ORDER.indexOf(b.key))
  ].filter((line): line is { key: string, label: string, value: React.ReactNode } => !!line)

  if (lines.length === 0 && fields.length === 0 && !showVehicle && contacts.length === 0 && !showBill) return null

  return (
    <FoldedRow
      open={open}
      onToggle={() => setOpen(!open)}
      label={t('MORE_DETAILS', 'More details')}
      header={<OText preset='label'>{t('MORE_DETAILS', 'More details')}</OText>}
      body={(
        <>
          {contacts.length > 0 && (
            <>
              {!!contactsTitle && <OText style={styles.subtitle}>{contactsTitle}</OText>}
              <ContactRows links={contacts} />
            </>
          )}
          {lines.map((line) => <DetailLine key={line.key} label={line.label} value={line.value} />)}
          {fields.length > 0 && (
            <>
              <OText style={styles.subtitle}>{t('CUSTOM_FIELDS', 'Custom fields')}</OText>
              {fields.map((field) => <DetailLine key={field.id} label={field.key} value={field.value} />)}
            </>
          )}
          {showVehicle && (
            <>
              {!!spotLine && <DetailLine label={spotLine.label} value={spotLine.value} />}
              {!!vehicle && <OText style={styles.subtitle}>{vehicleTitle}</OText>}
              {(vehicle ?? []).map((line) => <DetailLine key={line.key} label={line.label} value={line.value} />)}
            </>
          )}
          {showBill && (
            <>
              <OText style={styles.subtitle}>{t('SUMMARY', 'Summary')}</OText>
              <OrderBill order={order} compact />
            </>
          )}
        </>
      )}
      testID='focus-more-details'
    />
  )
}
