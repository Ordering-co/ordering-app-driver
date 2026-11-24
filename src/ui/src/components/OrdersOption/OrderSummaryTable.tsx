import React, { useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage, useUtils } from '@components'
import { Icon, OButton, OCard, ODivider, OText } from '../shared'
import { buildOrderSummary, flattenSummaryOrders } from './orderSummaryUtils'
import { orderSummaryStyles } from './styles'

interface FilterSummaryItem {
  label: string
  value: string
}

interface OrderSummaryTableProps {
  orders: any[]
  successStatuses: number[]
  failedStatuses: number[]
  driverName: string
  filterSummary: FilterSummaryItem[]
  loading: boolean
  totalCount: number | null
  canLoadMore: boolean
  onLoadMore: () => void
}

/**
 * The summary of the filtered orders as tiles (completed, cancelled, cash tips) under the
 * driver and the filters: the section `summary` of the page `orders`, hidden by default (decision P1).
 */
export const OrderSummaryTable = (props: OrderSummaryTableProps) => {
  const {
    orders,
    successStatuses,
    failedStatuses,
    driverName,
    filterSummary,
    loading,
    totalCount,
    canLoadMore,
    onLoadMore,
  } = props

  const theme: any = useTheme()
  const [, t] = useLanguage()
  const [{ parsePrice }] = useUtils()
  const [collapsed, setCollapsed] = useState(false)
  const styles: any = useMemo(() => orderSummaryStyles(theme), [theme])

  const flatOrders = useMemo(() => flattenSummaryOrders(orders), [orders])
  const firstOrder = flatOrders[0]
  const loadedCount = flatOrders.length

  const summary = useMemo(
    () => buildOrderSummary(orders, { successStatuses, failedStatuses }),
    [orders, successStatuses, failedStatuses],
  )

  const driverFullName = useMemo(() => {
    const driver = firstOrder?.driver
    const fromOrder = driver ? `${driver.name ?? ''} ${driver.lastname ?? ''}`.trim() : ''
    return fromOrder || driverName
  }, [firstOrder, driverName])

  /** The day's numbers as tiles: the completed and the cancelled orders and the cash tips (the cancelled tile counts the failed deliveries only, as it always has). */
  const tiles = [
    { key: 'completed', label: t('COMPLETED', 'Completed'), value: `${summary.exitosa.count}` },
    { key: 'cancelled', label: t('CANCELLED', 'Cancelled'), value: `${summary.fallida.count}` },
    { key: 'tips', label: t('TIP_CASH', 'Tip (Cash)'), value: parsePrice(summary.exitosa.tips) }
  ]

  return (
    <OCard testID='order-summary-table'>
      <View style={styles.box}>
        <Pressable
          accessibilityRole='button'
          accessibilityLabel={collapsed ? t('EXPAND', 'Expand') : t('COLLAPSE', 'Collapse')}
          accessibilityState={{ expanded: !collapsed }}
          onPress={() => setCollapsed(!collapsed)}
          style={({ pressed }) => [styles.head, pressed && styles.pressed]}
          testID='order-summary-toggle'
        >
          <OText style={styles.title} numberOfLines={1}>{t('ORDERS_SUMMARY', 'Orders Summary')}</OText>
          <Icon name={collapsed ? 'chevron-down' : 'chevron-up'} color='text_muted' />
        </Pressable>

        {collapsed ? (
          <OText preset='body_sm'>
            {`${t('SUMMARY', 'Summary')}: ✓${summary.exitosa.count} · ✗${summary.fallida.count} · ${parsePrice(summary.exitosa.tips)}`}
          </OText>
        ) : (
          <>
            <ODivider />
            <View style={styles.meta}>
              {[{ label: t('DRIVER', 'Driver'), value: driverFullName || '—' }, ...(filterSummary ?? [])].map((item, i) => (
                <View style={styles.metaRow} key={`${item.label}-${i}`}>
                  <OText preset='body_sm' color='text_muted'>{item.label}</OText>
                  <OText preset='body_sm' style={styles.metaValue} numberOfLines={1}>{item.value}</OText>
                </View>
              ))}
            </View>

            <View style={styles.tiles}>
              {tiles.map((tile) => (
                <View key={tile.key} style={[styles.tile, styles[`tile_${tile.key}`]]} testID={`order-summary-${tile.key}`}>
                  <OText preset='body_sm' numberOfLines={1}>{tile.label}</OText>
                  <OText preset='h4' numberOfLines={1} adjustsFontSizeToFit>{tile.value}</OText>
                </View>
              ))}
            </View>

            <View style={styles.footer}>
              <OText preset='body_sm' color='text_muted' style={styles.footerText}>
                {t('LOADED_ORDERS_COUNT', 'Loaded: _loaded_ of _total_')
                  .replace('_loaded_', `${loadedCount}`)
                  .replace('_total_', totalCount != null ? `${totalCount}` : '—')}
              </OText>
              {canLoadMore && (
                <OButton
                  size='sm'
                  text={t('LOAD_MORE_ORDERS', 'Load more orders')}
                  loading={loading}
                  onClick={onLoadMore}
                />
              )}
            </View>
          </>
        )}
      </View>
    </OCard>
  )
}
