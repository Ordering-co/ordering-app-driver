import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View, ScrollView } from 'react-native';
import { useTheme } from 'styled-components/native';

import { PreviousMessagesParams } from '../../types';
import { FooterComponent } from './FooterMessageComponent';
import { messageListStyles } from './styles';
import { orderStatusVariant, timeStateOf } from '../shared/orderStates';

import { useLanguage, useUtils } from '@components';
import { OAvatar, OBadge, ODivider, OText, MessageListSkeleton } from '../shared';
import { useSecureOrderId } from '../../hooks/useSecureOrderId';
import { formatDelay, joinTitle, orderNumberTag, orderStatusName } from '../../utils';
import { themePart } from '@/theme/helpers';
import dayjs from '@/utils/dayjs';
import { unreadMessagesText } from '../../../../context/UnreadMessagesContext';

const activeStatus = [0, 3, 4, 7, 8, 9, 13, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26]
const NO_ORDERS: Array<any> = []

/**
 * The orders of the Messages tab, each a flat row that opens its chat
 * (`components.list_row`'s look): the store's logo, its title "#number · store"
 * (bold while it has unread messages; one line, the store's name is what is cut,
 * never the number) over the order's date and its status as a badge colored by
 * state (decision D4), and at the row's end the order's time state
 * (the timer, in the state's color) over the count of unread messages
 * (`chat_bubble.slots.unread`). A row grows with its content; the styles are in
 * `./styles`, shared with the list's skeleton.
 */
type MessageRowProps = {
  order: any
  /** The store's logo, already sized. */
  logo?: string
  /** "#123 · Store A": the order's number (masked in a secure project) and the store's name, as the order card's header writes its title. */
  title: string
  /** The delivery date. */
  meta: string
  /** The time left or the delay of an order still open, as the app writes an order's timer (`formatDelay`). */
  timer?: string
  /** The status in the app's one list of names (`orderStatusName`). */
  status?: string
  onPress: (order: any) => void
  styles: ReturnType<typeof messageListStyles>
}

const MessageRow = React.memo(({ order, logo, title, meta, timer, status, onPress, styles }: MessageRowProps) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const unread = theme.native.components.chat_bubble.slots.unread
  const unreadCount = Number(order?.unread_count) > 0 ? Number(order.unread_count) : 0
  // In time, at risk or delayed in the state's text color; an order not measured yet is muted.
  const timeState = timeStateOf(order?.time_status)
  // What a screen reader says is what the row shows, piece by piece: the title, the date, the status, the timer and the unread count.
  const label = [title, meta, status, timer, unreadCount > 0 && unreadMessagesText(t, unreadCount)].filter(Boolean).join(', ')
  return (
    <Pressable
      testID='message-row'
      accessibilityRole='button'
      accessibilityLabel={label}
      onPress={() => onPress(order)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <OAvatar kind='business' size='md' source={logo} />
      <View style={styles.info}>
        {/* One line: the number comes first, so when the title is long it is the store's name that is cut, never the number. */}
        <OText preset='label' weight={unreadCount > 0 ? 'bold' : undefined} numberOfLines={1} ellipsizeMode='tail' testID='message-title'>
          {title}
        </OText>
        {/* One line, as the mockup's row (76 high). */}
        <OText preset='body_sm' color='text_muted' numberOfLines={1} ellipsizeMode='tail' testID='message-meta'>
          {meta}
        </OText>
        {!!status && (
          <View style={styles.badges}>
            <OBadge variant={orderStatusVariant(order?.status)} style={styles.status} testID='message-status'>
              {status}
            </OBadge>
          </View>
        )}
      </View>
      {(timer !== undefined || unreadCount > 0) && (
        <View style={styles.aside}>
          {timer !== undefined && (
            <OText style={styles.timer} color={timeState ? `${timeState}_text` : 'text_muted'} testID='message-timer'>
              {timer}
            </OText>
          )}
          {unreadCount > 0 && (
            <View accessible accessibilityLabel={unreadMessagesText(t, unreadCount)}>
              <OBadge count variant={unread.variant} size={unread.size} testID='message-unread'>
                {unreadCount}
              </OBadge>
            </View>
          )}
        </View>
      )}
    </Pressable>
  )
})

export const PreviousMessages = (props: PreviousMessagesParams) => {
  const {
    orders,
    onNavigationRedirect,
    setOrders,
    getOrders,
    pagination,
    loading,
    reload,
    tabs,
    loadMore,
    tabsFilter,
    error
  } = props;

  const [, t] = useLanguage();
  const theme: any = useTheme();
  const styles = useMemo(() => messageListStyles(theme), [theme]);
  const [{ parseDate, optimizeImage }] = useUtils();
  const { maskOrderId } = useSecureOrderId();
  const [refreshing] = useState(false);
  const spinner = themePart(theme, 'spinner', 'base.color')
  const spinnerColors = useMemo(() => [spinner], [spinner])

  const handlePressOrder = useCallback((order: any) => {
    const uuid = order?.id;

    onNavigationRedirect &&
      onNavigationRedirect('OrderMessage', { orderId: uuid, setOrders });
  }, [onNavigationRedirect, setOrders]);

  const getDelayMinutes = (order: any) => {
    const offset = 300
    const cdtToutc = dayjs(order?.delivery_datetime).add(offset, 'minute').format('YYYY-MM-DD HH:mm:ss')
    const _delivery = order?.delivery_datetime_utc
      ? parseDate(order?.delivery_datetime_utc, { outputFormat: 'YYYY-MM-DD HH:mm:ss' })
      : parseDate(cdtToutc, { outputFormat: 'YYYY-MM-DD HH:mm:ss' })
    const _eta = order?.eta_time
    // A missing or non-numeric preparation time adds nothing (moment's `add`; dayjs's would make the date invalid).
    const diffTimeAsSeconds = dayjs(_delivery).add(Number(_eta) || 0, 'minute').diff(dayjs.utc(), 'second')
    return Math.ceil(diffTimeAsSeconds / 60)
  }

  // A status's name of the app's one list, looked up once per status and
  // language: the list is not built again for every row of every render.
  const statusName = useMemo(() => {
    const names = new Map<string, string | undefined>()
    return (status: number | string | null | undefined) => {
      const key = String(status)
      if (!names.has(key)) names.set(key, orderStatusName(t, status))
      return names.get(key)
    }
  }, [t])

  const renderOrder = ({ item: order }: { item: any }) => (
    <MessageRow
      order={order}
      logo={order?.business?.logo ? optimizeImage(order.business.logo, 'h_300,c_limit') : undefined}
      title={joinTitle([orderNumberTag(maskOrderId(order?.id)), order?.business?.name])}
      meta={order?.delivery_datetime_utc
        ? parseDate(order?.delivery_datetime_utc)
        : parseDate(order?.delivery_datetime, { utc: false })}
      timer={activeStatus.includes(order?.status) ? formatDelay(getDelayMinutes(order), t) : undefined}
      status={statusName(order?.status)}
      onPress={handlePressOrder}
      styles={styles}
    />
  )

  // The rows show once the list is loaded without an error, on the orders tab.
  const showRows = !reload && !error && JSON.stringify(tabsFilter) === JSON.stringify(tabs[0].tags)
  const showInitialSkeleton = (loading || reload) && !orders?.length;

  return (
    <View style={styles.fill}>
      {showInitialSkeleton ? (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <MessageListSkeleton count={6} />
        </ScrollView>
      ) : (
        <FlatList
          data={showRows ? orders : NO_ORDERS}
          renderItem={renderOrder}
          keyExtractor={(order) => String(order?.id)}
          ItemSeparatorComponent={ODivider}
          showsVerticalScrollIndicator={false}
          style={styles.list}
          contentContainerStyle={[styles.content, !orders?.length && styles.contentEmpty]}
          refreshControl={<RefreshControl
            refreshing={refreshing}
            onRefresh={() => getOrders?.()}
            tintColor={spinner}
            colors={spinnerColors}
          />}
          ListFooterComponent={<FooterComponent
            loading={loading}
            reload={reload}
            pagination={pagination}
            tabsFilter={tabsFilter}
            tabs={tabs}
            loadMore={loadMore}
            skeletonCount={orders?.length ? 2 : 0}
          />}
        />
      )}
    </View>
  );
};
