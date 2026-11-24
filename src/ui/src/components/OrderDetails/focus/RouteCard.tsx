import React, { useMemo } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { focusStyles } from './styles'
import { useStopDistance } from './useStopDistance'
import { driverTipAmount, hasDriverTip } from '../OrderBill'
import { themeVisible } from '@/theme/helpers'
import { Icon, OButton, OCard, ODivider, OText } from '../../shared'
import { useOrderPayment } from '../../../hooks/useOrderPayment'

import { useLanguage, useUtils } from '@components'

interface Props {
  order: any
  /** Which stops the page shows: a hidden section shows neither its half of the route nor its distance. */
  showBusiness: boolean
  showCustomer: boolean
  driverPosition?: any
  onOpenMap: () => void
}

/**
 * An order offered to the driver (or not on its way yet): the route in one card, the store to pick up at over
 * the customer to deliver to, with the "View on the map" button, and under it the three facts that decide
 * whether to take it: the total, how it is paid and the driver's tip.
 */
export const RouteCard = ({ order, showBusiness, showCustomer, driverPosition, onOpenMap }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const [{ parsePrice }] = useUtils()
  const payment = useOrderPayment(order)
  const { fromDriver, fromStore } = useStopDistance(driverPosition)
  const styles = useMemo(() => focusStyles(theme), [theme])
  const map = theme.native.components.order_details.slots.stop_map

  const business = order?.business
  const storeLine = [business?.address, fromDriver(business?.location)].filter(Boolean).join(' · ')
  const customerDistance = fromStore(order)
  const showTotal = themeVisible(theme, 'confirmation.order.total')
  const facts = [
    showTotal && { key: 'total', label: t('TOTAL', 'Total'), value: payment.total },
    { key: 'payment', label: payment.count > 1 ? t('PAYMENT_METHODS', 'Payment methods') : t('PAYMENT', 'Payment'), value: payment.methods },
    hasDriverTip(order) && { key: 'tip', label: t('DRIVER_TIP', 'Driver tip'), value: parsePrice(driverTipAmount(order)) }
  ].filter((fact): fact is { key: string, label: string, value: string } => !!fact)

  return (
    <>
      {(showBusiness || showCustomer) && (
        <OCard style={styles.card} testID='focus-route'>
          <View style={styles.route}>
            {showBusiness && (
              <View style={styles.stop}>
                <View style={styles.rail}>
                  <Icon name='storefront-outline' color='primary_text' />
                  {showCustomer && <View style={styles.railLine} />}
                </View>
                <View style={styles.grow}>
                  <OText preset='body_sm' color='text_muted'>{t('PICK_UP_AT', 'Pick up at')}</OText>
                  <OText preset='label'>{business?.name}</OText>
                  {!!storeLine && <OText preset='body_sm' color='text_muted'>{storeLine}</OText>}
                </View>
              </View>
            )}
            {showCustomer && (
              <View style={styles.stop}>
                <View style={styles.rail}>
                  <Icon name='location-outline' color='primary_text' />
                </View>
                <View style={styles.grow}>
                  <OText preset='body_sm' color='text_muted'>{t('DELIVER_TO', 'Deliver to')}</OText>
                  <OText preset='label'>{order?.customer?.address}</OText>
                  {!!customerDistance && <OText preset='body_sm' color='text_muted'>{customerDistance}</OText>}
                </View>
              </View>
            )}
          </View>
          {themeVisible(theme, 'confirmation.order.directions') && (
            <OButton
              color={map.color}
              appearance={map.appearance}
              size={map.size}
              icon={<Icon name='navigate-outline' />}
              text={t('VIEW_ON_THE_MAP', 'View on the map')}
              onClick={onOpenMap}
            />
          )}
        </OCard>
      )}
      <OCard style={styles.factsCard} testID='focus-facts'>
        <View style={styles.facts}>
          {facts.map((fact, index) => (
            <React.Fragment key={fact.key}>
              {index > 0 && <ODivider variant='vertical' />}
              <View style={styles.fact}>
                <OText preset='body_sm' color='text_muted'>{fact.label}</OText>
                <OText preset='h4' align='center' numberOfLines={1}>{fact.value}</OText>
              </View>
            </React.Fragment>
          ))}
        </View>
      </OCard>
    </>
  )
}
