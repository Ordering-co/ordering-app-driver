import React, { useCallback, useState, useEffect, useMemo } from 'react';
import {
  ScrollView,
  View,
  StyleSheet
} from 'react-native';
import { useTheme } from 'styled-components/native';

import { MessagesOptionParams } from '../../types';

import { Contacts, useApi, useEvent, useLanguage, useSession } from '@components';
import { FilterChip, ONavbar, OText } from '../shared'
import { NotFoundSource } from '../NotFoundSource'
import { PreviousMessages } from '../PreviousMessages'
import { apiErrorText } from '../../utils'
import { themeGutter, themeSpace, themeVisible } from '@/theme/helpers'
import { unreadTotal, useReportUnreadMessages } from '../../../../context/UnreadMessagesContext'
import { useOnReconnect } from '../../../../context/SocketReconnectContext'
import { openChatOrderId } from '../../../../navigators/NavigationRef'

/**
 * The Messages tab: its title (`visibility.messages.title`), the sort chips
 * in one scrolling row (`visibility.messages.sort`) and the orders with
 * messages (`PreviousMessages`): only the orders that have direct messages are listed (`ORDERS_WITH_MESSAGES`, below),
 * so an empty list is a driver with no conversation yet and says so, never "no results". The chips and the list carry the page gutter on their
 * content, as the rest of the app's lists do.
 *
 * It also tells the tab bar how many messages are unread: the sum of the
 * `unread_count` of the orders it has loaded (the one datum the API gives; no
 * call of its own), `more` when the list has pages it has not loaded yet. It
 * says nothing before there is a session, while the list loads for the first time or
 * once it has failed, so the tab shows no number the app cannot know.
 *
 * The list is asked for only once there is a session (a token and a user), and again when the
 * user changes: the tab is built at launch, before the driver signs in, and a request that left
 * earlier was answered 401. A failed list is never kept: the `Contacts` controller carries the
 * error of the render a request left from into its answer (`{ ...orders, data }` with the old
 * `error`), so a retry made on the same controller still shows the old error. Any new request
 * made while the list is in error (refresh, a page, another sort) is therefore a new controller
 * (`restart`), which asks again from nothing.
 *
 * It is built at launch, before its tab is ever opened (`BottomNavigator`), and stays in the tree
 * while another tab is shown: nothing here may depend on the screen being visible (no focus
 * effect, no read marking, no sound, no tracking event); `MessagesOption.live.test.tsx` pins it.
 */
const messagesStyles = (theme: any) => StyleSheet.create({
  sort: { flexGrow: 0, marginBottom: themeSpace(theme, 'md') },
  // The chips scroll out to the screen's edges: the gutter is on their content.
  chips: { gap: themeSpace(theme, 'sm'), paddingHorizontal: themeGutter(theme) },
  gutter: { paddingHorizontal: themeGutter(theme) },
  // The empty state's title and its line: `xs` apart, both centered in the state's box.
  emptyLine: { marginTop: themeSpace(theme, 'xs') },
  list: { flex: 1 },
})

/**
 * What the Messages tab lists: the orders that have direct messages (the owner's decision of 2026-11-24,
 * `docs/theme/decisions.md`). The server filters the pages (`orderConditions`, sent as the request's `where`, so the
 * pages, the totals, "Load more" and every refetch are the conversations only) and `orderFilter` tells the real-time
 * events which unknown orders may enter the list (a first message does; a status change of an order with no messages
 * does not). Module constants on purpose: they are read when a request is made or an event arrives, never as a
 * dependency, so a new identity per render would change nothing, but the controller is given the same ones every time.
 */
const ORDERS_WITH_MESSAGES = [
  { attribute: 'last_direct_message_at', value: { condition: '!=', value: null } }
]
const hasDirectMessages = (order: any) => !!order?.last_direct_message_at

/** What the list's screen is given besides the controller's props: the sort it starts with, and how to start over. */
type MessagesOptionProps = MessagesOptionParams & {
  sortParams?: { param: string, direction: string }
  /** Remembers the sort the driver chose, so a new controller starts with it. */
  onSortChange?: (sortBy: { param: string, direction: string }) => void
  /** Starts the list over with a new controller (optionally with another sort). */
  onRestart?: (sortBy?: { param: string, direction: string }) => void
}

const MessagesOptionUI = (props: MessagesOptionProps) => {
  const {
    orders,
    setOrders,
    loadMore,
    pagination,
    messages,
    onNavigationRedirect,
    setSortBy,
    getOrders,
    sortParams,
    onSortChange,
    onRestart
  } = props;

  const theme: any = useTheme();
  const styles = useMemo(() => messagesStyles(theme), [theme]);
  const [, t] = useLanguage();
  const [events] = useEvent();

  const { loading, error, data: values } = orders;
  const tabs = [
    { key: 0, text: t('ORDERS', 'Orders'), tags: [0, 1] },
  ];

  const tags = [
    {
      key: 0,
      text: t('NEWEST', 'Newest'),
      sortBy: { param: 'last_direct_message_at', direction: 'asc' },
    },
    {
      key: 1,
      text: t('ORDER_NUMBER', 'Order number'),
      sortBy: { param: 'id', direction: 'desc' },
    },
  ];

  const [tabsFilter] = useState(tabs[0].tags);
  const [known, setKnown] = useState<{ total: number, more: boolean } | null>(null);
  const [activeTag, setActiveTag] = useState(() => tags.find(tag => tag.sortBy.param === sortParams?.param)?.key ?? tags[0].key);
  const [reload, setReload] = useState(false);

  const getTagFilter = (key: number) => {
    return tags.find(value => value.key === key)?.text;
  };

  const handleChangeTag = (key: number) => {
    if (activeTag !== key) {
      const tag = tags.find(tag => tag.key === key);
      setActiveTag(key);

      if (tabs[0].tags.includes(key) && tag) {
        onSortChange?.(tag.sortBy);
        if (error) {
          onRestart?.(tag.sortBy);
        } else {
          setSortBy?.(tag.sortBy);
          setReload(true);
        }
      }
    }
  };

  // A list that is loading keeps what it last knew (the count is replaced when a list arrives); one that has failed
  // knows nothing, and its error is not the count's to hide.
  useEffect(() => {
    if (loading) return
    if (error) {
      setKnown(null)
      return
    }
    setKnown({
      total: unreadTotal(orders.data),
      more: !!pagination?.totalPages && pagination.currentPage < pagination.totalPages
    })
  }, [loading, error, orders, pagination?.currentPage, pagination?.totalPages])
  useReportUnreadMessages(known)

  // A list in error asks again through a new controller (see the top of the file).
  const restart = useCallback(() => onRestart?.(), [onRestart])

  // The socket came back: the messages of the gap are lost, so the list (and with it the tab's count) loads again.
  useOnReconnect(() => {
    if (error) restart()
    else getOrders?.()
  })

  // The chat that is open on screen is read as its messages arrive. The list refetches an order when a message of it
  // arrives, and that answer can land after the chat's own read (or before it) with a count the driver is already
  // looking at: the open chat's count is never kept.
  useEffect(() => {
    const openId = openChatOrderId()
    if (!setOrders || openId === undefined) return
    if (!orders?.data?.some((order: any) => Number(order?.id) === openId && Number(order?.unread_count) > 0)) return
    setOrders((previous: any) => ({
      ...previous,
      data: previous?.data?.map((order: any) => (Number(order?.id) === openId && Number(order?.unread_count) > 0 ? { ...order, unread_count: 0 } : order))
    }))
  }, [orders, setOrders])

  // The driver read the chat of an order: its count is zero in the list, so the sum (and the tab's badge) follows.
  useEffect(() => {
    if (!setOrders) return
    const handleChatRead = (orderId: number | string) => {
      setOrders((previous: any) => {
        const isUnread = (order: any) => Number(order?.id) === Number(orderId) && Number(order?.unread_count) > 0
        if (!previous?.data?.some(isUnread)) return previous
        return { ...previous, data: previous.data.map((order: any) => (isUnread(order) ? { ...order, unread_count: 0 } : order)) }
      })
    }
    events.on('order_message_read', handleChatRead)
    return () => events.off('order_message_read', handleChatRead)
  }, [events, setOrders])

  useEffect(() => {
    if (reload && !loading) {
      setReload(!reload);
    }
  }, [loading]);

  return (
    <>
      {themeVisible(theme, 'messages.title') && (
        <ONavbar title={t('MESSAGES', 'Messages')} />
      )}
      {themeVisible(theme, 'messages.sort') && (
        <ScrollView
          horizontal
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          style={styles.sort}
          contentContainerStyle={styles.chips}
          testID='messages-sort'
        >
          {tabsFilter.map((key: number) => (
            <FilterChip
              key={key}
              text={getTagFilter(key)}
              size='md'
              selected={activeTag === key}
              onPress={() => handleChangeTag(key)}
            />
          ))}
        </ScrollView>
      )}

      {!loading && (values.length === 0 || error) && (
        <View style={styles.gutter}>
          {error
            ? <NotFoundSource content={apiErrorText(error, t)} conditioned={false} />
            : (
              // No conversation yet: the tab says so and how to start one (the list has no search or filter that
              // could have emptied it, so this is never "no results").
              <NotFoundSource>
                <OText preset='h4' align='center' testID='messages-empty-title'>{t('NO_MESSAGES_YET', 'No messages yet')}</OText>
                <OText preset='body_lg' color='text_muted' align='center' style={styles.emptyLine} testID='messages-empty-hint'>
                  {t('NO_MESSAGES_YET_HINT', 'Chats with customers and stores appear here. To start one, open an order and tap the chat button.')}
                </OText>
              </NotFoundSource>
            )}
        </View>
      )}
      <View style={styles.list}>
        <PreviousMessages
          orders={values}
          messages={messages}
          onNavigationRedirect={onNavigationRedirect}
          getOrders={error ? restart : getOrders}
          pagination={pagination}
          loading={loading}
          reload={reload}
          tabs={tabs}
          tabsFilter={tabsFilter}
          setOrders={setOrders}
          loadMore={error ? restart : loadMore}
          error={error}
        />
      </View>
    </>
  );
};

/** What the screen shows before there is a session: the list is not asked for, so it is loading. */
const WAITING_FOR_SESSION = { orders: { data: [], loading: true, error: null } }

export const MessagesOption = (props: MessagesOptionProps) => {
  const [{ token, user }] = useSession();
  const [ordering] = useApi();
  const [sortParams, setSortParams] = useState(props.sortParams);
  const [attempt, setAttempt] = useState(0);

  const restart = useCallback((sortBy?: MessagesOptionProps['sortParams']) => {
    if (sortBy) setSortParams(sortBy);
    setAttempt((count) => count + 1);
  }, []);

  // No `sortParams` key when there is none: an undefined one would override the controller's default.
  const sortProps = { ...(sortParams && { sortParams }), onSortChange: setSortParams };
  const userId = user?.id;

  if (!token || userId === undefined || userId === null) {
    return <MessagesOptionUI {...props} {...WAITING_FOR_SESSION} {...sortProps} />;
  }

  // The controller asks with the API object's own token and sets none (the others of the app set it on every
  // request): put the session's on it before the list is built, or the first request leaves with none.
  if (ordering.accessToken !== token) ordering.setAccessToken(token);

  // A new controller (a new key) per user and per start-over.
  return (
    <Contacts
      key={`${userId}:${attempt}`}
      {...props}
      {...sortProps}
      orderConditions={ORDERS_WITH_MESSAGES}
      orderFilter={hasDirectMessages}
      onRestart={restart}
      UIComponent={MessagesOptionUI}
    />
  );
};
