import React from 'react'
import { useTheme } from 'styled-components/native'

import { themeVisible } from '@/theme/helpers'
import { useConfig, useLanguage, useUtils } from '@components'

/**
 * The data of an order the details write besides its bills and its parties
 * (when it is for, its spot, its reservation, its external id, when it was
 * created), the same rules and the same texts for every screen that writes them.
 */

const CATERING_TYPES = [7, 8]

/** The order's status is written: not for an assignment request (the driver has no status in it yet). */
export const showsOrderStatus = (order: any, logisticOrderStatus?: number[]) =>
  !order?.isLogistic && (!order?.order_group_id || !logisticOrderStatus?.includes(order?.status))

/**
 * The order's comment as the driver should read it: what the customer typed, without the blank lines it begins
 * or ends with (a trailing line break would leave an empty band under the text). A comment of only blanks is
 * no comment (an empty text); the lines inside are kept. Every view of the order writes it through this.
 */
export const orderCommentText = (order: any): string =>
  typeof order?.comment === 'string' ? order.comment.trim() : ''

/** When the order is for, as the details write it: in full ("Placed to") and in short. */
export const useOrderDeliveryDate = (order: any) => {
  const [, t] = useLanguage()
  const [{ parseDate, timeFormat }] = useUtils()

  const dateString = order?.delivery_datetime_utc ?? order?.delivery_datetime
  const options = { utc: !!order?.delivery_datetime_utc }
  const isAsap = new Date(order?.delivery_datetime) <= new Date()
  const asap = t('ASAP_ABBREVIATION', 'ASAP')

  return {
    isAsap,
    /** "ASAP(11/18/2026 12:29 PM)" when it is already due, else the date. */
    full: isAsap ? `${asap}(${parseDate(dateString, options)})` : parseDate(dateString, options),
    /** "ASAP · 12:29 PM" when it is already due (the hour in the project's time format), else the date. */
    short: isAsap ? `${asap} · ${parseDate(dateString, { ...options, outputFormat: timeFormat })}` : parseDate(dateString, options)
  }
}

export interface OrderDataLine {
  key: string
  label: string
  value: React.ReactNode
}

/**
 * The lines of the order's data: its spot (table, lane), its reservation, its external id and the day it was
 * created, each under the conditions it has always had. `logisticOrderStatus` are the statuses of an
 * assignment request.
 */
export const useOrderDataLines = (order: any, logisticOrderStatus?: number[]): OrderDataLine[] => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const [configState] = useConfig()
  const [{ parseDate }] = useUtils()
  const showExternalId = configState?.configs?.change_order_id?.value === '1'

  const lines: Array<OrderDataLine | false> = [
    !order?.isLogistic && !!order?.delivery_type && (!order?.order_group_id || !logisticOrderStatus?.includes(order?.status)) && !!order?.spot_number && {
      key: 'spot',
      label: order?.delivery_type === 3
        ? t('EATIN_SPOT_NUMBER', 'Table number')
        : order?.delivery_type === 5
          ? t('DRIVE_THRU_SPOT_NUMBER', 'Drive thru lane')
          : t('CURBSIDE_SPOT_NUMBER', 'Spot number'),
      value: order.spot_number
    },
    order?.delivery_type === 9 && !!order?.reservation && {
      key: 'reservation',
      label: t('RESERVATION_SCHEDULED_TO', 'Reservation scheduled to'),
      value: <>{parseDate(order?.reservation?.reserve_date, { utc: false })}{'\n'}{order?.reservation?.guests_reservation} {t('GUESTS', 'Guests')}</>
    },
    !!order?.external_id && !showExternalId && {
      key: 'external_id',
      label: t('EXTERNAL_ID', 'External ID'),
      value: order.external_id
    },
    CATERING_TYPES.includes(order?.delivery_type) && themeVisible(theme, 'confirmation.order.date') && {
      key: 'created_at',
      label: t('CREATED_AT', 'Created at'),
      value: parseDate(order?.created_at)
    }
  ]
  return lines.filter((line): line is OrderDataLine => !!line)
}
