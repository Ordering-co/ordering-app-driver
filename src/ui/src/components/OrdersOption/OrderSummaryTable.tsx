import React, { useMemo, useState } from 'react'
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import AntDesignIcon from 'react-native-vector-icons/AntDesign'
import { useTheme } from 'styled-components/native'

import { useLanguage, useUtils } from '@components'
import { OText } from '../shared'
import { buildOrderSummary, flattenSummaryOrders } from './orderSummaryUtils'

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

  const theme = useTheme()
  const [, t] = useLanguage()
  const [{ parsePrice }] = useUtils()
  const [collapsed, setCollapsed] = useState(false)

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

  const styles = StyleSheet.create({
    card: {
      backgroundColor: theme.colors.white,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.borderTops,
      marginTop: 12,
      marginBottom: 12,
      overflow: 'hidden',
    },
    headerBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.colors.gray100,
    },
    headerTitle: {
      fontFamily: theme.fonts.primary.name,
      fontWeight: '600',
      fontSize: 14,
      color: theme.colors.textGray,
    },
    collapsedLine: {
      paddingHorizontal: 12,
      paddingBottom: 10,
      fontSize: 13,
      color: theme.colors.textGray,
    },
    metaBlock: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
    metaRow: { flexDirection: 'row', marginBottom: 4 },
    metaLabel: {
      fontWeight: '600',
      fontSize: 12,
      color: theme.colors.textGray,
      width: 110,
    },
    metaValue: { fontSize: 12, color: theme.colors.textGray, flex: 1 },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: theme.colors.primary,
      paddingVertical: 6,
      paddingHorizontal: 12,
      marginTop: 8,
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderTops,
    },
    th: { fontWeight: '600', fontSize: 12, color: theme.colors.white },
    td: { fontSize: 13, color: theme.colors.textGray },
    colOrders: { flex: 1.4 },
    colQty: { flex: 1, textAlign: 'center' },
    colTip: { flex: 1.2, textAlign: 'right' },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    footerText: { fontSize: 11, color: theme.colors.backArrow, flexShrink: 1 },
    loadMoreBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 110,
      height: 32,
      paddingHorizontal: 12,
      borderRadius: 7.6,
      backgroundColor: theme.colors.primary,
    },
    loadMoreText: { fontSize: 12, fontWeight: '600', color: theme.colors.white },
  })

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.headerBar} activeOpacity={0.7} onPress={() => setCollapsed(!collapsed)}>
        <OText style={styles.headerTitle}>{t('ORDERS_SUMMARY', 'Orders Summary')}</OText>
        <AntDesignIcon name={collapsed ? 'down' : 'up'} size={16} color={theme.colors.textGray} />
      </TouchableOpacity>

      {collapsed ? (
        <OText style={styles.collapsedLine}>
          {`${t('SUMMARY', 'Summary')}: ✓${summary.exitosa.count} · ✗${summary.fallida.count} · ${parsePrice(summary.exitosa.tips)}`}
        </OText>
      ) : (
        <>
          <View style={styles.metaBlock}>
            <View style={styles.metaRow}>
              <OText style={styles.metaLabel}>{t('DRIVER', 'Driver')}</OText>
              <OText style={styles.metaValue}>{driverFullName || '—'}</OText>
            </View>
            {(filterSummary ?? []).map((item, i) => (
              <View style={styles.metaRow} key={`${item.label}-${i}`}>
                <OText style={styles.metaLabel}>{item.label}</OText>
                <OText style={styles.metaValue}>{item.value}</OText>
              </View>
            ))}
          </View>

          <View style={styles.tableHeader}>
            <OText style={{ ...styles.th, ...styles.colOrders }}>{t('ORDERS', 'Orders')}</OText>
            <OText style={{ ...styles.th, ...styles.colQty }}>{t('QUANTITY', 'Quantity')}</OText>
            <OText style={{ ...styles.th, ...styles.colTip }}>{t('TIP_CASH', 'Tip (Cash)')}</OText>
          </View>
          <View style={styles.tableRow}>
            <OText style={{ ...styles.td, ...styles.colOrders }}>{t('COMPLETED', 'Completed')}</OText>
            <OText style={{ ...styles.td, ...styles.colQty }}>{`${summary.exitosa.count}`}</OText>
            <OText style={{ ...styles.td, ...styles.colTip }}>{parsePrice(summary.exitosa.tips)}</OText>
          </View>
          <View style={styles.tableRow}>
            <OText style={{ ...styles.td, ...styles.colOrders }}>{t('CANCELLED', 'Cancelled')}</OText>
            <OText style={{ ...styles.td, ...styles.colQty }}>{`${summary.fallida.count}`}</OText>
            <OText style={{ ...styles.td, ...styles.colTip }}>----</OText>
          </View>

          <View style={styles.footer}>
            <OText style={styles.footerText}>
              {t('LOADED_ORDERS_COUNT', 'Loaded: _loaded_ of _total_')
                .replace('_loaded_', `${loadedCount}`)
                .replace('_total_', totalCount != null ? `${totalCount}` : '—')}
            </OText>
            {canLoadMore && (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                activeOpacity={0.7}
                disabled={loading}
                onPress={onLoadMore}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={theme.colors.white} />
                ) : (
                  <OText style={styles.loadMoreText}>{t('LOAD_MORE_ORDERS', 'Load more orders')}</OText>
                )}
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </View>
  )
}
