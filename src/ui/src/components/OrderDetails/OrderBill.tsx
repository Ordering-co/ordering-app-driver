import React, { useMemo } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { contentStyles } from './styles'
import { OrderPair } from './OrderPair'
import { verifyDecimals } from '../../utils'
import { themeVisible } from '@/theme/helpers'
import { OCard, ODivider, OText, SectionTitle } from '../shared'

import { useLanguage, useUtils, useConfig } from '@components'

/** The order has a driver tip the bill and the facts show (not for a pickup). */
export const hasDriverTip = (order: any) =>
  (order?.summary?.driver_tip > 0 || order?.driver_tip > 0) && order?.delivery_type !== 2

/** The amount of the order's driver tip, to write with `parsePrice`. */
export const driverTipAmount = (order: any) => order?.summary?.driver_tip ?? order?.totalDriverTip

/** The taxes the prices already include (type 1): on the products, or on the delivery fee. */
export const includedTaxes = (order: any, isDeliveryFee?: boolean): number => {
  if (!order?.taxes) return 0
  if (order?.taxes?.length === 0) {
    return order.tax_type === 1 ? order?.summary?.tax ?? 0 : 0
  }
  return order.taxes.reduce((taxIncluded: number, tax: any) => {
    return taxIncluded +
      (((!isDeliveryFee && tax.type === 1 && tax.target === 'product') ||
        (isDeliveryFee && tax.type === 1 && tax.target === 'delivery_fee')) ? tax.summary?.tax : 0)
  }, 0)
}

/**
 * The bill's "Subtotal" amount, to write with `parsePrice`: the summary's subtotal (the order's own, in an older answer) with the taxes
 * the prices include. The bill and the copied text of the order read it here, so they say the same.
 */
export const orderSubtotal = (order: any): number => (order?.summary?.subtotal ?? order?.subtotal) + includedTaxes(order)

/**
 * An order's bill: its rows (subtotal, discounts, taxes, fees, delivery fee, driver tip), its total
 * (`confirmation.order.total`) and its payments (`confirmation.order.payments`). The details
 * draw it inside their payment row (or under "More details" while the order is only offered), and the assign
 * request's screen as its `bill` section.
 *
 * `compact` is the details' look (the approved mockup of the open payment): small rows a little apart, a thin line
 * over the total (bold) and the payments as muted lines of "Payments · Cash" with their amount as it is, not signed. The default is the look the assign request's screen has always drawn (its rows far apart,
 * a band over the total, a "Payments" card with each amount marked with a minus). The amounts and the rules that
 * decide which rows exist are the same in both.
 */
export const OrderBill = ({ order, compact = false }: { order: any, compact?: boolean }) => {
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const [{ parsePrice, parseNumber }] = useUtils()
  const [{ configs }] = useConfig()
  const details = theme.native.components.order_details
  const styles = useMemo(() => contentStyles(theme), [theme])

  const walletName: any = {
    cash: {
      name: t('PAY_WITH_CASH_WALLET', 'Pay with Cash Wallet'),
    },
    credit_point: {
      name: t('PAY_WITH_CREDITS_POINTS_WALLET', 'Pay with Credit Points Wallet'),
    }
  }

  const getIncludedTaxes = (isDeliveryFee?: boolean) => includedTaxes(order, isDeliveryFee)

  const getIncludedTaxesDiscounts = () => {
    return order?.taxes?.filter((tax: any) => tax?.type === 1 && tax?.target === 'product')?.reduce((carry: number, tax: any) => carry + (tax?.summary?.tax_after_discount ?? tax?.summary?.tax), 0)
  }

  /** A row of the bill: what it is and its amount. */
  const row = (label: React.ReactNode, amount: React.ReactNode, key?: string | number) => (
    <View style={styles.row} key={key}>
      <OText style={styles.rowLabel}>{label}</OText>
      <OText style={styles.rowAmount}>{amount}</OText>
    </View>
  )

  /** What the payment event is called: its wallet, its gateway's name or the order's own method. */
  const paymentName = (event: any) => event?.wallet_event
    ? walletName[event?.wallet_event?.wallet?.type]?.name
    : event?.paymethod?.gateway
      ? t(event?.paymethod?.gateway?.toUpperCase?.(), event?.paymethod?.name)
      : order?.paymethod?.id === event?.paymethod_id
        ? t(order?.paymethod?.gateway?.toUpperCase?.(), order?.paymethod?.name)
        : ''

  /**
   * The amount of a payment event. The minus is how the bill has always marked a payment against the total (the
   * amount the order was paid with, taken off it): cash with the amount the customer gave is the one line that
   * is written plain. `compact` writes a payment plain, as the mockup does, and keeps the minus for an event
   * that is not a payment (a refund: money out).
   */
  const paymentAmount = (event: any) => {
    if (event?.paymethod?.gateway === 'cash' && order?.cash) return parsePrice(order?.cash)
    if (compact && (!event?.event || event.event === 'payment')) return parsePrice(event?.amount)
    return `-${parsePrice(event?.amount)}`
  }

  const offerName = (offer: any) => (
    <>
      {t(offer.name?.toUpperCase?.()?.replace(/ /g, '_'), offer.name)}
      {offer.rate_type === 1 && `(${verifyDecimals(offer?.rate, parsePrice)}%)`}
    </>
  )

  return (
    <View style={compact ? undefined : styles.bill}>
      <View style={compact ? styles.rowsCompact : styles.rows}>
        {row(t('SUBTOTAL', 'Subtotal'), parsePrice(orderSubtotal(order)))}
        {((order?.summary?.discount > 0) || (order?.discount > 0)) && order?.offers?.length === 0 && row(
          order?.offer_type === 1
            ? <>{t('DISCOUNT', 'Discount')}{' '}{`(${verifyDecimals(order?.offer_rate, parsePrice)}%)`}</>
            : t('DISCOUNT', 'Discount'),
          <>- {parsePrice(order?.summary?.discount ?? order?.discount)}</>
        )}
        {
          order?.offers?.length > 0 && order?.offers?.filter((offer: any) => offer?.target === 1)?.map((offer: any) => row(
            offerName(offer),
            <>- {parsePrice(offer?.summary?.discount)}</>,
            offer.id
          ))
        }
        {order?.summary?.subtotal_with_discount > 0 && order?.summary?.discount > 0 && order?.summary?.total >= 0 && row(
          t('SUBTOTAL_WITH_DISCOUNT', 'Subtotal with discount'),
          order?.tax_type === 1
            ? parsePrice((order?.summary?.subtotal_with_discount + getIncludedTaxesDiscounts()))
            : parsePrice(order?.summary?.subtotal_with_discount ?? 0)
        )}
        {order?.taxes?.length === 0 && order?.tax_type === 2 && order?.summary?.tax > 0 && row(
          <>{t('TAX', 'Tax')} {`(${verifyDecimals(order?.tax, parseNumber)}%)`}</>,
          parsePrice(order?.summary?.tax ?? 0)
        )}
        {
          order?.fees?.length === 0 && order?.summary?.service_fee > 0 && row(
            <>{t('SERVICE_FEE', 'Service fee')}{`(${verifyDecimals(order?.service_fee, parseNumber)}%)`}</>,
            parsePrice(order?.summary?.service_fee ?? 0)
          )
        }
        {
          order?.taxes?.length > 0 && order?.taxes?.filter((tax: any) => tax?.type === 2 && tax?.rate !== 0 && tax?.target === 'product').map((tax: any) => row(
            <>
              {t(tax?.name?.toUpperCase?.()?.replace(/ /g, '_'), tax?.name) || t('INHERIT_FROM_BUSINESS', 'Inherit from business')}
              {`(${verifyDecimals(tax?.rate, parseNumber)}%)`}{' '}
            </>,
            parsePrice(tax?.summary?.tax_after_discount ?? tax?.summary?.tax ?? 0),
            tax.id
          ))
        }
        {
          order?.fees?.length > 0 && order?.fees?.filter((fee: any) => !(fee.fixed === 0 && fee.percentage === 0))?.map((fee: any) => row(
            <>
              {t(fee?.name?.toUpperCase?.()?.replace(/ /g, '_'), fee?.name) || t('INHERIT_FROM_BUSINESS', 'Inherit from business')}
              ({fee?.fixed > 0 && `${parsePrice(fee?.fixed)} + `}{fee.percentage}%){' '}
            </>,
            parsePrice(fee?.summary?.amount ?? (fee?.summary?.fixed + (fee?.summary?.percentage_after_discount ?? fee?.summary?.percentage))),
            fee.id
          ))
        }
        {
          order?.offers?.length > 0 && order?.offers?.filter((offer: any) => offer?.target === 3)?.map((offer: any) => row(
            offerName(offer),
            <>- {parsePrice(offer?.summary?.discount)}</>,
            offer.id
          ))
        }
        {
          typeof order?.summary?.delivery_price === 'number' && order.delivery_type !== 2 && row(
            t('DELIVERY_FEE', 'Delivery Fee'),
            parsePrice(order?.summary?.delivery_price + getIncludedTaxes(true))
          )
        }
        {
          order?.taxes?.length > 0 && order?.taxes?.filter((tax: any) => tax?.type === 2 && tax?.rate !== 0 && tax?.target === 'delivery_fee').map((tax: any, i: number) => row(
            <>
              {tax.name || t('INHERIT_FROM_BUSINESS', 'Inherit from business')}
              {`(${verifyDecimals(tax?.rate, parseNumber)}%)`}
            </>,
            parsePrice(tax?.summary?.tax_after_discount ?? tax?.summary?.tax ?? 0),
            `${tax.description}_${i}`
          ))
        }
        {
          order?.offers?.length > 0 && order?.offers?.filter((offer: any) => offer?.target === 2)?.map((offer: any) => row(
            offerName(offer),
            <>- {parsePrice(offer?.summary?.discount)}</>,
            offer.id
          ))
        }
        {hasDriverTip(order) && row(
          <>
            {t('DRIVER_TIP', 'Driver tip')}
            {order?.driver_tip > 0 && parseInt(configs?.driver_tip_type?.value, 10) === 2 &&
              !parseInt(configs?.driver_tip_use_custom?.value, 10) &&
              (
                `(${verifyDecimals(order?.driver_tip, parseNumber)}%)`
              )}
          </>,
          parsePrice(driverTipAmount(order))
        )}
      </View>

      {themeVisible(theme, 'confirmation.order.total') && (
        <>
          <ODivider variant={compact ? 'item' : details.base.divider} style={compact ? styles.totalLine : undefined} />

          <View style={compact ? styles.totalRowCompact : styles.row}>
            <OText style={styles.totalLabel} weight={compact ? 600 : undefined}>
              {t('TOTAL', 'Total')}
            </OText>
            <OText style={styles.totalAmount} weight={compact ? 600 : undefined}>
              {parsePrice(order?.summary?.total ?? order?.total)}
            </OText>
          </View>
        </>
      )}

      {order?.payment_events?.length > 0 && themeVisible(theme, 'confirmation.order.payments') && (compact ? (
        <View style={styles.paymentsCompact} testID='bill-payments'>
          {order?.payment_events?.map((event: any) => (
            <View style={styles.row} key={event.id}>
              <OText style={styles.paymentLabel}>{`${t('PAYMENTS', 'Payments')} · ${paymentName(event)}`}</OText>
              <OText style={styles.paymentAmount}>{paymentAmount(event)}</OText>
            </View>
          ))}
        </View>
      ) : (
        <OCard style={styles.card}>
          <SectionTitle text={details.base.address_title}>{t('PAYMENTS', 'Payments')}</SectionTitle>
          <View style={styles.body}>
            {order?.payment_events?.map((event: any) => (
              <React.Fragment key={event.id}>
                <OrderPair label={paymentName(event)} value={paymentAmount(event)} />
              </React.Fragment>
            ))}
          </View>
        </OCard>
      ))}
    </View>
  )
}
