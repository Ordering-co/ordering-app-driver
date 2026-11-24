import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { View, ScrollView, ScrollViewInstance, RefreshControl } from 'react-native';
import RNRestart from 'react-native-restart'
import { parseSearchDay } from '@/utils/dayjs'
import { useTheme } from 'styled-components/native';

import { ordersOptionStyles } from './styles';
import { OrdersOptionParams } from '../../types';
import { _retrieveStoreData, _setStoreData, _removeStoreData } from '../../providers/StoreUtil'
import { themePart, themeVisible } from '@/theme/helpers';
import { usePageSections } from '@/theme/sections';

import { useLanguage, useUtils, OrderListGroups, useConfig, useEvent, useSession } from '@components';
import { NotificationSetting } from '../NotificationSetting'
import { useOfflineActions } from '../../context/OfflineActions'
import {
  Icon,
  OText,
  OButton,
  FilterChip,
  OModal,
  ONavbar,
  ONotice,
  Tabs,
  OrderListSkeleton,
  SkeletonBone,
} from '../shared'
import { NotFoundSource } from '../NotFoundSource'
import { PreviousOrders } from '../PreviousOrders'
import { OrdersRouteEntry } from '../OrdersRoute/OrdersRouteEntry'
import { WebsocketStatus } from '../WebsocketStatus'
import { OrderSummaryTable } from './OrderSummaryTable'
import { OrdersSearchForm } from './OrdersSearchForm'
import { SEARCH_ENCODES_PERCENT, searchTerm } from './searchText'
import { orderCardPieces } from '../PreviousOrders/orderCardPieces'
import { useAcceptSheet } from '../../hooks/useAcceptSheet'
import { useReloadQueue } from './useReloadQueue'
import { useCombinedTabs } from './useCombinedTabs'
import { CATCH_UP_COALESCE_MS, RECONNECT_SETTLE_MS, useOrderTabs } from './useOrderTabs'
import { LOGISTIC_VIEW, viewForStatus, viewsFor, type HistoryFilter, type OrdersView } from './orderTabs'
import { ChipRow } from './ChipRow'
import { ORDER_CHANGED_EVENT, OrderChange } from '../../hooks/useAnnounceOrderChange'
import { useSettledWhileHeld } from '../shared/holdLatch'
import { useListDriverPosition } from '../../hooks/useListDriverPosition'
import { useOnReconnect } from '../../../../context/SocketReconnectContext'
import { applyQueuedChanges, isOrderQueued, showQueuedStages } from '../../context/OfflineActions/offlineActionsQueue'
import { apiErrorText, orderStatusList } from '../../utils'

/** The format the orders search sends its dates in (what `search.date` holds): never what the driver reads. */
const SEARCH_DATE_FORMAT = 'MM/DD/YYYY'

/** The tab of the assign requests (the logistic orders). */
const LOGISTIC_TAB = LOGISTIC_VIEW

/** How long the lists wait for the queue's sync run (ms), and how long the stage of a sent change stays on its row waiting for the reload. */
const SYNC_HOLD_LIMIT_MS = 45000
const HELD_STAGE_LIMIT_MS = 60000

/** The lists the app reloads, one load at a time each (`useReloadQueue`). */
const ORDERS_LIST = 'orders'
const REQUESTS_LIST = 'requests'

/** What the search form holds with nothing typed. */
const DEFAULT_SEARCH = {
  id: '',
  external_id: '',
  state: '',
  city: '',
  business: '',
  delivery_type: '',
  paymethod: '',
  driver: '',
  timeStatus: '',
  date: {
    from: '',
    to: '',
    type: ''
  }
}

/** The orders with a delivery position first, by it: the order the driver chose to deliver them in. */
const sortByDeliveryPosition = (orders: any[]) => {
  if (!orders?.length) return orders
  return [...orders].sort((a, b) => {
    const posA = Array.isArray(a) ? null : a?.delivery_position
    const posB = Array.isArray(b) ? null : b?.delivery_position
    if (posA != null && posB != null) return posA - posB
    if (posA != null) return -1
    if (posB != null) return 1
    return 0
  })
}

const OrdersOptionUI = (props: OrdersOptionParams) => {
  const {
    navigation,
    tabs,
    combineTabs,
    tabsPending,
    setCombineTabsState,
    isNetConnected,
    currentTabSelected,
    setCurrentTabSelected,
    ordersGroup,
    setOrdersGroup,
    orderStatus,
    loadOrders,
    loadMoreOrders,
    onNavigationRedirect,
    onFiltered,
    handleClickOrder,
    handleClickLogisticOrder,
    handleUpdateLogisticOrdersEta,
    logisticOrders,
    loadLogisticOrders,
    isLogisticActivated,
    handleChangeOrderStatus: changeOrderStatus,
    handleSendCustomerReview,
    ordersFiltered,
    loadingChangeOrder,
    tabRequest
  } = props;

  const theme: any = useTheme();
  const [, t] = useLanguage();
  const [{ parseDate, dateFormat }] = useUtils()
  const [configState] = useConfig()
  const [events] = useEvent()
  const [offlineActionsState] = useOfflineActions()
  const [{ user }] = useSession()
  const styles = useMemo(() => ordersOptionStyles(theme), [theme])
  // The accept view of a group of orders and of an assign request is a sheet over this screen. It is kept here and not in
  // the list: the list goes away when the last request is answered, and its sheet would go with it.
  const { openSheet: openAcceptSheet, sheet: acceptSheet } = useAcceptSheet({
    actions: props.orderDetailsProps?.actions,
    orderTitle: props.orderDetailsProps?.orderTitle,
    appTitle: props.orderDetailsProps?.appTitle,
    isLoadingOrder: loadingChangeOrder
  })
  // A request's reject is held and answers with the finger still on its button, and the answer takes the card out of the
  // list (the last one takes the list itself): the list shows what it showed until the finger lifts, so the pressed
  // button is not taken from under it and the next touch is not lost (`holdLatch`).
  const requests = useSettledWhileHeld(logisticOrders)
  // The page's sections (`pages.orders`): the tabs, the summary table and the list.
  const { render, isVisible } = usePageSections('orders')
  // The pull-to-refresh spinner in the theme's spinner color, on both platforms.
  const refreshColors = useMemo(() => [themePart(theme, 'spinner', 'base.color')], [theme])

  const [openSearchModal, setOpenSearchModal] = useState(false)
  // What the form holds (the draft the driver is typing) and what the list has been asked for (applied with "Search"): the list
  // follows the second only, so typing opens no filtered view and a reload asks for nothing that was not applied.
  const [search, setSearch] = useState(DEFAULT_SEARCH)
  const [appliedSearch, setAppliedSearch] = useState(DEFAULT_SEARCH)
  const hasSearchFilters = useMemo(() => JSON.stringify(DEFAULT_SEARCH) !== JSON.stringify(appliedSearch), [appliedSearch])

  // The stage of a queued change that still waits (one the API refused, or not sent yet) stays on its card over what the server holds,
  // online too: it is pending, and only a change that was dropped puts the server's stage back.
  const queuedActions = offlineActionsState.actions
  // The queue was sent (`offline_order_updated`): the stage each of its changes gave an order stays on its row until the lists have loaded
  // again after the run, so the order does not fall back to the copy the lists held before it (a load that went out before the run's
  // requests answered can bring it). `everQueued` is the last queue seen for each order, to know what to keep when the queue is emptied.
  const [held, setHeld] = useState<Record<string, { changes: any[], at: number }>>({})
  const everQueued = useRef<Record<string, any[]>>({})
  Object.keys(queuedActions ?? {}).forEach((id) => {
    if (isOrderQueued(queuedActions, id)) everQueued.current[id] = (queuedActions as any)[id]
  })
  const queuedChanges = useMemo(
    () => (Object.keys(held).length
      ? { ...Object.fromEntries(Object.entries(held).map(([id, entry]) => [id, entry.changes])), ...queuedActions }
      : queuedActions),
    [held, queuedActions]
  )
  // A queue run that never ends (its requests are bounded, but the state is not trusted for ever) does not hold the lists for good.
  const [syncExpired, setSyncExpired] = useState(false)
  const syncing = !!offlineActionsState.syncing
  useEffect(() => {
    if (!syncing) { setSyncExpired(false); return undefined }
    const timer = setTimeout(() => setSyncExpired(true), SYNC_HOLD_LIMIT_MS)
    return () => clearTimeout(timer)
  }, [syncing])
  useEffect(() => {
    if (!Object.keys(held).length) return undefined
    const timer = setTimeout(() => setHeld({}), HELD_STAGE_LIMIT_MS)
    return () => clearTimeout(timer)
  }, [held])
  // The tabs (Assigned, In Progress, History; Active and History when the project combines them) on top of the controller's lists:
  // which tab is selected is this screen's, what each one holds and how its lists load is `useOrderTabs`.
  const orderTabs = useOrderTabs({
    ordersGroup,
    setOrdersGroup,
    currentTabSelected,
    setCurrentTabSelected,
    loadOrders,
    loadMoreOrders,
    tabs,
    combined: !!combineTabs,
    tabsPending,
    isNetConnected,
    searching: hasSearchFilters,
    queuedChanges,
    holdLoads: syncing && !syncExpired
  })
  const { view: selectedView, filter: historyFilter } = orderTabs
  const isLogisticTab = selectedView === LOGISTIC_TAB

  // The loads of the lists, one at a time each and never over a change of the driver's own (`useReloadQueue`: the controller's
  // loads are not cancellable and each writes a whole snapshot, so overlapping ones leave the last to end, not the last asked).
  const { request: requestReload, track: trackChange } = useReloadQueue()
  // The driver's position for the cards' distances: the last one known, read again each time the list loads again.
  const { position: driverPosition, refresh: refreshDriverPosition } = useListDriverPosition()
  // What a reload reads when it runs, which may be after the render that asked for it.
  const latestLoads = useRef<any>({})
  latestLoads.current = { loadOrders, loadLogisticOrders, hasSearchFilters, isNetConnected, reloadLists: orderTabs.reload }
  // No reload is asked, or runs, without a connection: the load could only fail (or hang) and, in the controller, a load marks
  // the list as loading and writes a whole snapshot when it ends, over what the offline list shows (the stored orders with the
  // queued changes applied). The check is made twice, as the reload is asked and as it runs (it may have waited behind another
  // load or a change of the driver's own while the connection went away).
  const isOffline = () => latestLoads.current.isNetConnected === false
  const reloadOrders = useCallback(() => {
    // The position is read whatever the connection (a fix needs none) and kept if the read fails.
    refreshDriverPosition()
    if (isOffline()) return
    requestReload(ORDERS_LIST, () => {
      const startedAt = Date.now()
      const { loadOrders: load, hasSearchFilters: filtered, reloadLists } = latestLoads.current
      if (isOffline() || !load) return
      // A search is applied: its results load again. Otherwise the tab's lists do, one after another (`useOrderTabs`). The stages kept
      // for the changes the queue sent before this reload was asked are what the lists now hold: they stop covering them.
      const done = filtered ? load({ newFetch: true }, { allStatusses: true }) : reloadLists()
      return Promise.resolve(done).finally(() => setHeld((current) => {
        const kept = Object.entries(current).filter(([, entry]) => entry.at > startedAt)
        return kept.length === Object.keys(current).length ? current : Object.fromEntries(kept)
      }))
    })
  }, [requestReload, refreshDriverPosition])
  const reloadRequests = useCallback(() => {
    if (isOffline()) return
    requestReload(REQUESTS_LIST, () => !isOffline() && latestLoads.current.loadLogisticOrders?.())
  }, [requestReload])

  // The driver's own status changes (a group's or one order's, from the card, the confirmation dialog, a sheet or a
  // reason page: they all send this handler) move the orders between the tabs without waiting for the socket, which the
  // app must not depend on for its own actions (offline, reconnecting): once the API has answered and the change took
  // for at least one order, the list is loaded again, the controller's own reload (the refresh button's), once. The reload
  // is asked while the change still counts as on its way, so it waits for it (and for the others of a group sent order
  // by order) and joins any reload asked meanwhile; it runs after the render that carries the state the change left.
  const handleChangeOrderStatus = useCallback((...args: any[]) => trackChange(async () => {
    const answer = await (changeOrderStatus as ((...params: any[]) => Promise<any>) | undefined)?.(...args)
    // What the controller answers: the orders' results (`null` for one that failed), or `{ error }` entries with details.
    const changed = Array.isArray(answer) && answer.some((entry: any) => !!entry && !(typeof entry === 'object' && entry.error))
    if (changed) reloadOrders()
    return answer
  }), [changeOrderStatus, trackChange, reloadOrders])
  // The answers to the assign requests and the delivery times are changes too: a reload must not overlap them.
  const answerRequest = useCallback((...args: any[]) => trackChange(async () => (handleClickLogisticOrder as any)?.(...args)), [handleClickLogisticOrder, trackChange])
  const saveDeliveryTimes = useCallback((...args: any[]) => trackChange(async () => (handleUpdateLogisticOrdersEta as any)?.(...args)), [handleUpdateLogisticOrdersEta, trackChange])

  // The summary table is the section `summary` (decision P1): its visibility is the only switch.
  const hasSummary = isVisible('summary')
  const summarySuccessStatuses = tabs?.find((tab: any) => tab.title === 'completed')?.tags ?? [1, 11, 15]
  const summaryFailedStatuses = [12]
  const summaryExcludedStatuses = (tabs?.find((tab: any) => tab.title === 'cancelled')?.tags ?? [2, 5, 6, 10, 12, 16, 17])
    .filter((status: number) => !summaryFailedStatuses.includes(status))
  const driverName = `${user?.name ?? ''} ${user?.lastname ?? ''}`.trim()

  const datePresetLabels: { [key: string]: string } = {
    today: t('TODAY', 'Today'),
    yesterday: t('YESTERDAY', 'Yesterday'),
    last_7days: t('LAST_7_DAYS', 'Last 7 days'),
    last_30days: t('LAST_30_DAYS', 'Last 30 days'),
  }
  /** A day of the searched range as the driver reads it: the project's date format. */
  const shownDate = (value: string) => value
    ? parseDate(parseSearchDay(value), { outputFormat: dateFormat, utc: false })
    : '—'
  // What the summary says is what the list was asked for, not what the form holds now.
  const buildFilterSummary = () => {
    const items: { label: string; value: string }[] = []
    if (appliedSearch.date?.from || appliedSearch.date?.to) {
      items.push({ label: t('DATE', 'Date'), value: `${shownDate(appliedSearch.date.from)} → ${shownDate(appliedSearch.date.to)}` })
    } else if (appliedSearch.date?.type) {
      items.push({ label: t('DATE', 'Date'), value: datePresetLabels[appliedSearch.date.type] ?? appliedSearch.date.type })
    }
    if (appliedSearch.id) items.push({ label: t('ORDER_NUMBER', 'Order number'), value: `${appliedSearch.id}` })
    if (appliedSearch.external_id) items.push({ label: t('EXTERNAL_ID', 'External id'), value: `${appliedSearch.external_id}` })
    if (appliedSearch.city) items.push({ label: t('CITY', 'City'), value: `${(appliedSearch as any).cityName || appliedSearch.city}` })
    return items
  }

  const [lastDateConnection, setLastDateConnection] = useState(null)
  const [internetLoading, setInternetLoading] = useState(!isNetConnected && isNetConnected !== null)

  const isProjectEnterpricePlan = configState?.configs?.plan_enterprise && configState?.configs?.plan_enterprise?.value

  const scrollListRef = useRef<ScrollViewInstance | null>(null);

  // What the list in view is: the results of the search while one is applied, else the tab's lists.
  const list = hasSearchFilters
    ? {
        loading: !!ordersFiltered?.loading,
        unsettled: ordersFiltered?.pagination?.total === null,
        error: ordersFiltered?.error,
        hasMore: !!ordersFiltered?.pagination?.totalPages && ordersFiltered.pagination.currentPage < ordersFiltered.pagination.totalPages
      }
    : orderTabs

  // Without a connection nothing can answer a load: a list left "loading" by one that never ended (it was asked before the connection
  // went, or by a path the app cannot guard, as the controller's own load of the requests) is not a list that is loading. It draws
  // what it holds (the stored orders with the queued changes applied) or, with nothing, the network error.
  const offline = isNetConnected === false
  const ordersLoading = !offline && !!list.loading
  const requestsLoading = !offline && !!requests?.loading

  // While the project's tabs are not known (`tabsPending`) the list is the skeleton: what the controller loaded meanwhile is the other set's.
  const loadingValidation = (
    ordersLoading ||
    (!!list.unsettled && !!isNetConnected) ||
    requestsLoading ||
    !!tabsPending
  ) && !list.error?.length

  // What the lists draw, worked out when what they come from changes and not on each render of this screen (the form's typing,
  // a sheet's state): the sort copies the whole list.
  const filteredOrders = ordersFiltered?.orders
  // The tabs' rows already carry the queued stages (`useOrderTabs` splits the orders by them); a search's results get them here.
  const tabRows = orderTabs.rows
  const listedOrders = useMemo(
    () => sortByDeliveryPosition(hasSearchFilters ? showQueuedStages(filteredOrders ?? [], queuedChanges) : tabRows),
    [hasSearchFilters, filteredOrders, tabRows, queuedChanges]
  )
  // The next page of what is in view: a tab with nothing to show while its lists still have pages says "Load more" and not "no results".
  const paginationValidation =
    !offline &&
    !list.error?.length &&
    !list.loading &&
    list.hasMore &&
    (!hasSearchFilters || ordersFiltered?.orders?.length > 0)
  // A held step of a card (arrived, pickup complete, delivery complete) answers with the finger still on its button, and the answer moves
  // the order (it changes its tab, or its buttons): the list shows what it showed until the finger lifts, as the requests do.
  const shownOrders = useSettledWhileHeld(listedOrders)
  const requestOrders = requests?.orders
  const listedRequests = useMemo(
    () => requestOrders?.filter((order: any) => !order?.expired).map((order: any) => ({ ...order, isLogistic: true })),
    [requestOrders]
  )

  const handleLoadMore = () => {
    // A page asked for without a connection could only fail, and the controller marks the list as loading while it waits.
    if (offline) return
    if (hasSearchFilters) loadMoreOrders && loadMoreOrders({ allStatusses: true })
    else orderTabs.loadMore()
  };

  const getOrderStatus = (key: number) => {
    return orderStatus.find((status: any) => status?.key === key)?.text;
  };

  const applyFilters = () => {
    const dateRange = calculateDate(search.date.type, search.date.from, search.date.to)
    setAppliedSearch(search)
    onFiltered && onFiltered({
      ...search,
      id: searchTerm(search.id),
      external_id: searchTerm(search.external_id),
      date: { ...dateRange },
      ...(hasSummary && { excludeStatuses: summaryExcludedStatuses }),
    })
    setOpenSearchModal(false)
  }

  const calculateDate = (type: any, from: any, to: any) => {
    switch (type) {
      case 'today':
        const date = parseDate(new Date(), { outputFormat: SEARCH_DATE_FORMAT })
        return { from: `${date} 00:00:00`, to: `${date} 23:59:59` }
      case 'yesterday':
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const start1 = parseDate(yesterday, { outputFormat: SEARCH_DATE_FORMAT })
        const end1 = parseDate(new Date(), { outputFormat: SEARCH_DATE_FORMAT })
        return { from: `${start1} 00:00:00`, to: `${end1} 23:59:59` }
      case 'last_7days':
        const last_7days = new Date()
        last_7days.setDate(last_7days.getDate() - 6)
        const start7 = parseDate(last_7days, { outputFormat: SEARCH_DATE_FORMAT })
        const end7 = parseDate(new Date(), { outputFormat: SEARCH_DATE_FORMAT })
        return { from: `${start7} 00:00:00`, to: `${end7} 23:59:59` }
      case 'last_30days':
        const last_30days = new Date()
        last_30days.setDate(last_30days.getDate() - 29)
        const start30 = parseDate(last_30days, { outputFormat: SEARCH_DATE_FORMAT })
        const end30 = parseDate(new Date(), { outputFormat: SEARCH_DATE_FORMAT })
        return { from: `${start30} 00:00:00`, to: `${end30} 23:59:59` }
      default:
        const start = from ? `${from} 00:00:00` : ''
        const end = to ? `${to} 23:59:59` : ''
        return { from: start, to: end }
    }
  }

  // Leaving the form without searching drops what was typed, not what the list was already asked for.
  const handleClose = () => {
    setSearch(appliedSearch)
    setOpenSearchModal(false)
  }

  const handleClearFilters = () => {
    setSearch(DEFAULT_SEARCH)
    setAppliedSearch(DEFAULT_SEARCH)
    onFiltered && onFiltered(null)
  }

  useEffect(() => {
    scrollListRef.current?.scrollTo();
  }, [selectedView, historyFilter])

  useEffect(() => {
    const unsubcribe = navigation.addListener('focus', () => {
      refreshDriverPosition()
      isLogisticTab && loadLogisticOrders && reloadRequests()
    })
    return unsubcribe
  }, [navigation, loadLogisticOrders, reloadRequests, isLogisticTab, refreshDriverPosition])

  useEffect(() => {
    const handleDeliveryPositionUpdated = () => {
      loadOrders && reloadOrders()
    }
    events.on('delivery_position_updated', handleDeliveryPositionUpdated)
    return () => events.off('delivery_position_updated', handleDeliveryPositionUpdated)
  }, [events, loadOrders, reloadOrders])

  // A change of the driver's own made on another screen (the order's details, the assign request's details) reaches the list
  // through this event, not through the socket: the screen announces it once the API answered and the change took, and the
  // list loads again through its queue (so after a change of its own that is on its way, and joined with any load asked
  // meanwhile). The changes sent through this list's handler load it themselves and announce nothing, so there is one load
  // per change. Offline nothing is announced (the change is only queued) and nothing loads: the list shows what was queued.
  // The handler reads the latest loads through the ref, so the listener subscribes once.
  useEffect(() => {
    const handleOrderChanged = (change?: OrderChange) => {
      if (latestLoads.current.isNetConnected === false) return
      if (change?.request) reloadRequests()
      if (!change?.request || change.accepted) reloadOrders()
    }
    events.on(ORDER_CHANGED_EVENT, handleOrderChanged)
    return () => events.off(ORDER_CHANGED_EVENT, handleOrderChanged)
  }, [events, reloadOrders, reloadRequests])

  // The offline orders: what the offline store holds, read as text to tell when it changed (once per change, not once per render).
  const offlineOrdersKey = useMemo(() => JSON.stringify(offlineActionsState.orders), [offlineActionsState.orders])
  const queueAllowed = offlineActionsState.canSaveChangesOffline !== false

  /**
   * Puts the stored orders (what `registerOffOrder` keeps, with the queued changes applied to their rows) in the lists, and ends
   * whatever loading or error a load left in them. It writes through a function of the controller's state, not from the snapshot of
   * this render, so a write of a load that ended meanwhile is not what is kept. `first` is the run that is the screen's way into
   * the offline list (it holds the skeleton until it is done); the later ones, to put the stored orders back after a load, do not.
   */
  const applyStoredOrders = async (first: boolean) => {
    const orderStatuses = ['active', 'pending', 'inProgress', 'completed', 'cancelled']
    if (first) setInternetLoading(true)
    try {
      let lastConnection = await _retrieveStoreData('last_date_connection');
      // What the provider kept of the project's switch (from its loaded config, written as it changes).
      const allowSaveChangesOffline = await _retrieveStoreData('allow_save_changes_offline');

      // The project does not keep changes made offline: there is no offline list to draw.
      if (allowSaveChangesOffline === false) return

      // What the offline list holds, a list at a time. A list the store (or the provider) has an array for is the stored one, empty
      // or not (an order the queue moved out of it leaves it empty); one it has nothing for is not stored yet.
      let ordersStoraged: any = {}
      const stored: Record<string, boolean> = {}
      for (const status of orderStatuses) {
        const raw = await _retrieveStoreData(`${status}_orders`)
        stored[status] = Array.isArray(offlineActionsState.orders?.[status]) || Array.isArray(raw)
        ordersStoraged[status] = offlineActionsState.orders?.[status] ?? raw ?? []
      }

      if (!lastConnection) {
        const formattedDate = parseDate(new Date())
        lastConnection = formattedDate
        _setStoreData('last_date_connection', formattedDate);
      }

      lastConnection && setLastDateConnection(lastConnection)

      // The lists the store does not hold yet are kept as the lists have them now (all of them when it holds none). The rows each
      // list last held count, not the list as a load in the way left it (emptied when its load started, or failed): a stored list
      // is never built from, nor written over, the rows such a load took, and a list the store holds nothing for is never drawn
      // empty over the rows the screen has.
      const known = orderTabs.knownRows()
      const rowsOf = (status: string) => (ordersGroup[status]?.orders?.length ? ordersGroup[status].orders : known[status] ?? [])
      const noneStored = Object.values(ordersStoraged).every((key: any) => Array.isArray(key) && !key?.length)
      for (const status of orderStatuses) {
        if (!noneStored && stored[status]) continue
        const currentOrders = offlineActionsState.orders?.[status] ?? rowsOf(status)
        ordersStoraged[status] = currentOrders
        if (noneStored || currentOrders.length) _setStoreData(`${status}_orders`, currentOrders);
      }

      if (Object.values(ordersStoraged).some((key: any) => Array.isArray(key) && key?.length)) {
        // What is shown is the stored lists with the queue on top: an order the queue holds a change for shows its last queued status
        // and its sync mark, in the list of that status, whatever its stored copy (or the group it was stored in) says.
        const shown = applyQueuedChanges(ordersStoraged, offlineActionsState.actions, tabs)
        setOrdersGroup((current: any) => {
          const next = { ...current }
          for (const status of Object.keys(shown)) {
            // The lists drawn from the store count as loaded: the controller does not load them by itself the moment the connection
            // returns (the screen reloads them once, when it has settled, see `catchUp`).
            next[status] = { ...current?.[status], loading: false, error: null, fetched: true, orders: shown[status] }
          }
          return next
        })
      }
    } finally {
      // Whatever happened above, the list is not left behind its skeleton for good.
      if (first) setInternetLoading(false)
    }
  }

  // What the queue holds, as text: the offline lists are drawn again when it changes (a change queued, one sent), not on each render.
  const queueKey = useMemo(
    () => Object.entries(offlineActionsState.actions ?? {}).map(([id, changes]: any) => `${id}:${Array.isArray(changes) ? changes.length : 1}`).join(','),
    [offlineActionsState.actions]
  )
  // Going offline is the run that holds the skeleton; the ones after it (a change queued, an order registered) draw over the list.
  const wasOffline = useRef(false)

  useEffect(() => {
    const entering = !wasOffline.current
    wasOffline.current = isNetConnected === false
    if (isNetConnected) {
      _removeStoreData('last_date_connection');
      ['active', 'pending', 'inProgress', 'completed', 'cancelled'].forEach((key: any) => _setStoreData(`${key}_orders`, null))
    } else if (isNetConnected === false) {
      // A store that cannot be read leaves the lists as they are (the `finally` of the apply ends the skeleton), never an unhandled rejection.
      applyStoredOrders(entering).catch(() => {})
    }
  }, [isNetConnected, offlineOrdersKey, queueKey]);

  // A load that was on its way when the connection went (or one the app cannot guard, the controller's own) ends offline with its
  // loading flag left on, or with its failure written over the tabs, and with a snapshot that is older than the queued changes. With
  // the queue on the lists are given the stored orders again (once per such change of the lists, not once per render).
  const groupsDisturbed = isNetConnected === false && queueAllowed && ['active', 'pending', 'inProgress', 'completed', 'cancelled'].some((status) => {
    const group = ordersGroup?.[status]
    return !!group?.loading || (Array.isArray(group?.error) ? group.error.length > 0 : !!group?.error)
  })
  useEffect(() => {
    if (groupsDisturbed) applyStoredOrders(false).catch(() => {})
  }, [groupsDisturbed])

  // The queue sent its changes (`OfflineActions`, once per run, after every request of the run answered): the orders are
  // loaded again once, through the reload queue, so the rows show what the server holds now and not the stage that was
  // queued, with no refresh. A run in which every change failed announces nothing. If the screen still thinks it is offline
  // (the event can overtake this screen's own connection state by a render) the load waits for the connection.
  const reloadAfterSync = useRef(false)
  // The connection the screen has seen go and come back: `down` is "went away, and no reload since it returned" (a reload of any kind
  // that the return brought clears it, the one the queue's run announces included), `sawSync` that the queue's run started meanwhile.
  const reconnection = useRef({ down: false, sawSync: false })
  useEffect(() => {
    const handleSynced = (ids?: any[]) => {
      // What the run sent keeps the stage of its last change on the row until a reload that was asked after this lands.
      const at = Date.now()
      const kept: Record<string, { changes: any[], at: number }> = {}
      ;(Array.isArray(ids) ? ids : []).forEach((id) => {
        const changes = everQueued.current[String(id)]
        if (changes) kept[String(id)] = { changes, at }
      })
      if (Object.keys(kept).length) setHeld((current) => ({ ...current, ...kept }))
      if (latestLoads.current.isNetConnected === false) {
        reloadAfterSync.current = true
        return
      }
      reconnection.current.down = false
      reloadOrders()
    }
    events.on('offline_order_updated', handleSynced)
    return () => events.off('offline_order_updated', handleSynced)
  }, [events, reloadOrders])
  useEffect(() => {
    if (isNetConnected !== false && reloadAfterSync.current) {
      reloadAfterSync.current = false
      reconnection.current.down = false
      reloadOrders()
    }
  }, [isNetConnected, reloadOrders])

  // The controller starts from the switch this screen was given (`OrdersOption`) and is told only a different one afterwards: the config
  // that loads over the one an earlier run kept, or the value arriving once it was unknown. Telling it the same one again is no render
  // of its own, but its effect on the switch resets the list it works on: so it is not told twice. (It cannot move the tab the driver
  // sees: that one is this screen's, `useOrderTabs`.)
  const controllerSwitch = useRef(combineTabs)
  useEffect(() => {
    if (tabsPending || typeof combineTabs !== 'boolean' || controllerSwitch.current === combineTabs) return
    controllerSwitch.current = combineTabs
    setCombineTabsState?.(combineTabs)
  }, [combineTabs, tabsPending, setCombineTabsState])

  // The rows a list shows stay on screen while it loads again (a change of the driver's own, a pull to refresh, the socket): the controller
  // marks the list as loading for each of those and keeps its orders, and a list that went to its skeleton for the length of every reload
  // blinked after each step and took the card's buttons from under the finger. The skeleton is for a list with nothing to show yet.
  // The orders the settled list still shows (a finger is down on a held button, see `useSettledWhileHeld`) are rows too, even if the
  // controller's list is already empty (the last order of the tab moved to another).
  const ordersRowsShown = !isLogisticTab && !tabsPending && !(!hasSearchFilters && orderTabs.holdRows) &&
    !list.error?.length &&
    (listedOrders?.length > 0 || (shownOrders !== listedOrders && shownOrders?.length > 0))
  const requestsRowsShown = isLogisticTab && !requests?.error?.length && (listedRequests?.length ?? 0) > 0
  const hasRows = ordersRowsShown || requestsRowsShown
  // The pieces the cards of this tab draw: the skeleton draws the same ones.
  const cardTab = orderTabs.cardTab
  const cardPieces = orderCardPieces(cardTab, configState?.configs, isLogisticTab)
  const pendingSyncCount = Object.keys(offlineActionsState?.actions ?? {}).filter((id) => isOrderQueued(offlineActionsState?.actions, id)).length

  // The requests button is a switch: it opens the requests and, pressed again, goes back to the orders tab the driver was on
  // (pressing it with the requests open used to select the open tab again: the controller marks the list loading on a
  // selection and loads only when the tab changes, so the list stayed a skeleton for good).
  const lastOrdersTab = useRef<OrdersView | undefined>(undefined)
  if (!isLogisticTab) lastOrdersTab.current = selectedView
  const handleRequestsButton = () => {
    if (!isLogisticTab) {
      orderTabs.setView(LOGISTIC_TAB)
      return
    }
    orderTabs.setView(lastOrdersTab.current ?? viewsFor(!!combineTabs)[0])
  }

  const handleRefresh = () => isLogisticTab
    ? loadLogisticOrders && reloadRequests()
    : loadOrders && reloadOrders()

  // The new-order alert (it lives in the authed navigator, over every tab) asks for a list through the route's params:
  // the assign requests', or the list the new orders are in. The ask is consumed, so coming back to the tab later does
  // not select it again.
  useEffect(() => {
    if (!tabRequest?.at) return
    if (hasSearchFilters) handleClearFilters()
    if (tabRequest.show === 'requests') {
      // Already there: selecting the tab again would only mark the list loading (see `handleRequestsButton`), so load it.
      if (isLogisticActivated && !combineTabs) isLogisticTab ? loadLogisticOrders && reloadRequests() : orderTabs.setView(LOGISTIC_TAB)
    } else {
      // The tab the order's status is shown in: a new assigned order opens Assigned, a finished one History, no status the first tab.
      const target = viewForStatus(tabRequest.status, orderTabs.tags, !!combineTabs)
      orderTabs.setView(target.view, target.filter)
    }
    navigation?.setParams?.({ show: undefined, status: undefined, at: undefined })
  }, [tabRequest?.at])

  // The socket came back (or the app returned after a long while in the background): what the lists show may have
  // changed meanwhile, and the events of the gap are lost. The same loads as the refresh button, and the assign requests.
  const catchUp = () => {
    if (!isNetConnected) return
    if (isLogisticTab) loadLogisticOrders && reloadRequests()
    else {
      loadOrders && reloadOrders()
      if (isLogisticActivated && !combineTabs) loadLogisticOrders && reloadRequests()
    }
  }
  // One outage, one reload: the phone's connection and the socket both announce its end (the first, then the other a moment later),
  // and whichever comes first reloads; the other, arriving within `CATCH_UP_COALESCE_MS` of that reload, does nothing more.
  const lastCatchUpAt = useRef<number | null>(null)
  const catchUpOnce = () => {
    const now = Date.now()
    if (lastCatchUpAt.current !== null && now - lastCatchUpAt.current < CATCH_UP_COALESCE_MS) return
    // Not marked while there is no connection (`catchUp` does nothing then, and the signal that finds one must reload), nor while the
    // queue's run holds the reload of a connection that came back (the reload that follows the run is that connection's, below).
    if (!isNetConnected) return
    if (reconnection.current.down && syncing && !syncExpired) return
    lastCatchUpAt.current = now
    catchUp()
  }
  useOnReconnect(catchUpOnce)

  // The connection came back after the screen saw it go: what the lists show is what they held (or the stored lists), and the events of
  // the gap are lost, so they load again, once, by themselves, as the refresh button would. Not at the first moment (a connection that
  // flaps asks once, after it held for `RECONNECT_SETTLE_MS`) and not while the queue's run is sending its changes: what it announces
  // (`offline_order_updated`) is the reload, and if the run ends having sent nothing the reload is asked when it ends. Nothing here
  // asks again: a reload that fails is the screen's rows with the offline banner, and the next one is the next return.
  const catchUpLatest = useRef(catchUpOnce)
  catchUpLatest.current = catchUpOnce
  useEffect(() => {
    const link = reconnection.current
    if (isNetConnected === false) {
      link.down = true
      return undefined
    }
    if (isNetConnected !== true || !link.down) return undefined
    if (syncing && !syncExpired) {
      link.sawSync = true
      return undefined
    }
    const timer = setTimeout(() => {
      if (!link.down) return
      link.down = false
      link.sawSync = false
      catchUpLatest.current()
    }, RECONNECT_SETTLE_MS)
    return () => clearTimeout(timer)
  }, [isNetConnected, syncing, syncExpired])

  const showTitle = themeVisible(theme, 'orders.title')
  const showStatus = themeVisible(theme, 'connection_status')
  const showRefresh = !!isNetConnected && themeVisible(theme, 'orders.refresh')
  const showSearch = !isLogisticTab && themeVisible(theme, 'orders.search')
  const hasActions = showStatus || showRefresh || showSearch

  // The tab bar is held (a bone as high as the bar) while the project's tabs are not known: three tabs are never drawn for a project that
  // has four, nor four for one that has three.
  // What the tabs are called (Assigned · In Progress · History, or Active · History when the project combines them).
  const viewNames: Record<string, string> = {
    assigned: t('ASSIGNED', 'Assigned'),
    inProgress: t('IN_PROGRESS', 'In Progress'),
    active: t('ACTIVE', 'Active'),
    history: t('HISTORY', 'History')
  }
  const viewTabs = viewsFor(!!combineTabs).map((key) => ({ key, text: viewNames[key] }))
  const historyChips: Array<[HistoryFilter, string]> = [
    ['all', t('ALL', 'All')],
    ['completed', t('COMPLETED', 'Completed')],
    ['cancelled', t('CANCELLED', 'Cancelled')]
  ]
  const tabsSection = () => !hasSearchFilters && (tabsPending ? (
    <View style={[styles.tabs, styles.tabsFilled]} testID='orders-tabs-pending'>
      <View style={styles.tabsTrack}>
        <SkeletonBone width='100%' height={themePart(theme, 'tabs', 'sizes.md.height')} />
      </View>
    </View>
  ) : (
    <View style={styles.tabsBlock}>
      <View style={[styles.tabs, styles.tabsFilled]} testID='orders-tabs'>
        {(isLogisticActivated && !combineTabs) && (
          <OButton
            iconOnly
            color={isLogisticTab ? 'primary' : 'neutral'}
            appearance={isLogisticTab ? 'tonal' : 'solid'}
            icon={<Icon name='timer-outline' />}
            onClick={handleRequestsButton}
            accessibilityLabel={t('ASSIGN_REQUESTS', 'Assign requests')}
            testID='orders-logistic-tab'
          />
        )}
        <View style={styles.tabsTrack}>
          <Tabs
            // Each tab takes the width its label asks for (never two lines) and the room left over is shared equally among them; tabs
            // that still do not fit (a long language, a large font) scroll sideways, out to the screen's edge.
            fitFill
            endGutter
            noWrap
            testID='orders-tabs-strip'
            tabs={viewTabs}
            // The requests are not one of the tabs: with them open none is selected.
            selected={selectedView}
            onChange={(key: OrdersView) => orderTabs.setView(key)}
          />
        </View>
      </View>
      {selectedView === 'history' && (
        // History's chips narrow it to the completed or the cancelled orders (all by default); the selected one is announced.
        <View style={styles.chips}>
          <ChipRow testID='orders-history-chips' accessibilityRole='radiogroup' accessibilityLabel={viewNames.history}>
            {historyChips.map(([key, text]) => (
              <FilterChip
                key={key}
                size='sm'
                text={text}
                selected={historyFilter === key}
                onPress={() => orderTabs.setFilter(key)}
                testID={`orders-history-${key}`}
              />
            ))}
          </ChipRow>
        </View>
      )}
    </View>
  ))

  const summarySection = () => hasSearchFilters && !isLogisticTab && (
    <View style={styles.gutter}>
      <OrderSummaryTable
        orders={ordersFiltered?.orders}
        successStatuses={summarySuccessStatuses}
        failedStatuses={summaryFailedStatuses}
        driverName={driverName}
        filterSummary={buildFilterSummary()}
        loading={!!ordersFiltered?.loading}
        totalCount={ordersFiltered?.pagination?.total ?? null}
        canLoadMore={!!paginationValidation}
        onLoadMore={handleLoadMore}
      />
    </View>
  )

  // What an empty list says: Assigned, the assign requests and each chip of History have their own words; the rest, and the results of a
  // search or of filters (the requests' tab too), the general one.
  // Offline with the queue on, what the stored lists hold is what there is: a tab that has nothing says so, it is not a failed load. The
  // network error is for a list that failed to load, and for no stored list at all.
  const storedLists = offline && queueAllowed && ['pending', 'inProgress', 'completed', 'cancelled', 'active'].some((key) => ordersGroup?.[key]?.orders?.length > 0)
  const emptyText = hasSearchFilters ? t('NO_RESULTS_FOUND', 'Sorry, no results found')
    : isLogisticTab ? t('NO_ASSIGN_REQUESTS', 'No assign requests')
    : selectedView === 'assigned' ? t('NO_ORDERS_ASSIGNED', 'No orders assigned')
      : selectedView === 'inProgress' ? t('NO_ORDERS_IN_PROGRESS', 'No orders in progress')
        : selectedView === 'active' ? t('NO_ACTIVE_ORDERS', 'No active orders')
          : selectedView !== 'history' ? t('NO_RESULTS_FOUND', 'Sorry, no results found')
            : historyFilter === 'completed' ? t('NO_COMPLETED_ORDERS', 'No completed orders')
              : historyFilter === 'cancelled' ? t('NO_CANCELLED_ORDERS', 'No cancelled orders')
                : t('NO_ORDERS_IN_HISTORY', 'No orders in your history')

  const listSection = () => (
    <ScrollView
      ref={scrollListRef}
      showsVerticalScrollIndicator={false}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      nestedScrollEnabled={true}
      refreshControl={
        <RefreshControl
          refreshing={false}
          tintColor={refreshColors[0]}
          colors={refreshColors}
          onRefresh={() => { isNetConnected && handleRefresh() }}
        />
      }
    >
      <OrdersRouteEntry view={hasSearchFilters ? undefined : selectedView} orders={shownOrders} onNavigationRedirect={onNavigationRedirect} handleChangeOrderStatus={handleChangeOrderStatus} />
      {ordersRowsShown && (
          <PreviousOrders
            orders={shownOrders}
            navigation={props.navigation}
            onNavigationRedirect={onNavigationRedirect}
            getOrderStatus={getOrderStatus}
            handleClickOrder={handleClickOrder}
            currentTabSelected={cardTab}
            appTitle={props.orderDetailsProps?.appTitle}
            actions={props.orderDetailsProps?.actions}
            orderTitle={props.orderDetailsProps?.orderTitle}
            handleChangeOrderStatus={handleChangeOrderStatus}
            openAcceptSheet={openAcceptSheet}
            handleSendCustomerReview={handleSendCustomerReview}
            regressionRequest={props.regressionRequest}
            clearRegressionRequest={props.clearRegressionRequest}
            loadingChangeOrder={loadingChangeOrder}
            activeOrdersCount={ordersGroup?.inProgress?.orders?.length ?? 0}
            driverPosition={driverPosition}
          />
        )}
      {!requests?.error?.length &&
        requests && requests?.orders?.length > 0 &&
        isLogisticTab && (
          <PreviousOrders
            orders={listedRequests}
            onNavigationRedirect={onNavigationRedirect}
            getOrderStatus={getOrderStatus}
            handleClickLogisticOrder={handleClickLogisticOrder && answerRequest}
            handleUpdateLogisticOrdersEta={handleUpdateLogisticOrdersEta && saveDeliveryTimes}
            openAcceptSheet={openAcceptSheet}
            isLogisticOrder
            loadingChangeOrder={loadingChangeOrder}
          />
        )
      }
      {(loadingValidation || internetLoading) && !hasRows && (
        <OrderListSkeleton
          count={5}
          showTimer={cardPieces.timer || cardPieces.closedTime}
          showPosition={cardPieces.position}
          showSetter={cardPieces.setter}
          // History's cards are finished orders (all three chips): no stop line, no buttons.
          closed={cardPieces.closedTime}
          logistic={isLogisticTab}
          // The In Progress list starts with the route's button (`OrdersRouteEntry`: not while a search is applied).
          routeEntry={selectedView === 'inProgress' && !hasSearchFilters && themeVisible(theme, 'orders.route')}
        />
      )}

      {isNetConnected && paginationValidation && (
        <OButton
          onClick={handleLoadMore}
          text={t('LOAD_MORE_ORDERS', 'Load more orders')}
          disabled={!!loadingValidation}
          testID='orders-load-more'
        />
      )}

      {!internetLoading && !loadingValidation && !ordersRowsShown &&
        ((!isLogisticTab && !ordersLoading && !paginationValidation &&
          (list.error?.length ||
            listedOrders.length === 0)) ||
          (isLogisticTab &&
            (requests && !requestsLoading && (requests?.error?.length > 0 || requests?.orders?.length === 0 || !requests?.orders?.some((order: any) => !order?.expired))))
        ) &&
        (
          <NotFoundSource
            content={
              !isNetConnected && !storedLists ? t('NETWORK_ERROR', 'Network Error') :
                ((!isLogisticTab && !list.error?.length) ||
                  (isLogisticTab && (!requests?.error?.length || (requests?.orders?.length > 0 && !requests?.orders?.some((order: any) => !order?.expired)))))
                  ? emptyText
                  : apiErrorText(
                    list.error?.[0]?.message || list.error?.[0] || (isLogisticTab && requests?.error),
                    t
                  )
            }
            conditioned={false}
            btnTitle={!isNetConnected && !storedLists && t('REFRESH', 'Refresh')}
            onClickButton={!isNetConnected && !storedLists && (() => RNRestart.Restart())}
          />
        )}
    </ScrollView>
  )

  return (
    <>
      {(showTitle || hasActions) && (
        <ONavbar
          testID='orders-header'
          rightButtons
          titleFirst
          title={showTitle ? t('MY_ORDERS', 'My orders') : undefined}
          right={hasActions ? (
            // The bar lays its actions `header.gap` apart, as every screen's.
            <>
              {showStatus && <WebsocketStatus />}
              {showRefresh && (
                <OButton
                  iconOnly
                  color='neutral'
                  appearance='ghost'
                  icon={<Icon name='refresh' />}
                  onClick={handleRefresh}
                  accessibilityLabel={t('REFRESH', 'Refresh')}
                  testID='orders-refresh'
                />
              )}
              {showSearch && (
                <OButton
                  iconOnly
                  // With a filter on, the button is painted as selected.
                  color={hasSearchFilters ? 'primary' : 'neutral'}
                  appearance={hasSearchFilters ? 'tonal' : 'ghost'}
                  icon={<Icon name='search' />}
                  onClick={() => setOpenSearchModal(true)}
                  accessibilityLabel={t('SEARCH_ORDERS', 'Search orders')}
                  testID='orders-search'
                />
              )}
            </>
          ) : undefined}
        />
      )}
      <View style={styles.body}>
        {isNetConnected === false && lastDateConnection ? (
          <View style={styles.gutter}>
            <ONotice variant='danger' testID='orders-offline'>
              <OText preset='label'>
                {`${t('LAST_UPDATE', 'Last Update')}: ${lastDateConnection}`}
              </OText>
              {pendingSyncCount > 0 && (
                <OText preset='body_sm'>
                  {t('NUMBER_CHANGES_PENDING_SYNC', '_value_ changes pending sync').replace('_value_', String(pendingSyncCount))}
                </OText>
              )}
            </ONotice>
          </View>
        ) : pendingSyncCount > 0 && (
          // The queue still holds changes (online, retrying; or offline before a last update is known): the count alone. "Last
          // update" and the offline color are about the connection, which is not what this says.
          <View style={styles.gutter}>
            <ONotice variant='info' testID='orders-sync-pending'>
              <OText preset='label'>
                {t('NUMBER_CHANGES_PENDING_SYNC', '_value_ changes pending sync').replace('_value_', String(pendingSyncCount))}
              </OText>
            </ONotice>
          </View>
        )}
        {hasSearchFilters && (
          <View style={styles.gutter}>
            <ONotice variant='warning' showIcon={false} testID='orders-filter-notice'>
              <View style={styles.notice}>
                <OText preset='body' style={styles.noticeText}>
                  {t('WARNING_FILTER_APPLIED', 'Filters applied. You may miss new orders.')}
                </OText>
                <OButton
                  size='md'
                  appearance='outline'
                  text={t('CLEAR_FILTERS', 'Clear filters')}
                  onClick={handleClearFilters}
                />
              </View>
            </ONotice>
          </View>
        )}
        {render({ tabs: tabsSection, summary: summarySection, list: listSection })}
      </View>

      {acceptSheet}

      {openSearchModal && (
        <OModal
          open={openSearchModal}
          entireModal
          hideIcons
          title={t('SEARCH_ORDERS', 'Search orders')}
          onClose={() => handleClose()}
        >
          <OrdersSearchForm
            search={search}
            onSearch={setSearch}
            onApply={applyFilters}
            onClear={handleClearFilters}
            showSla={!!isProjectEnterpricePlan}
            cityProps={props}
          />
        </OModal>
      )}
    </>
  );
};

export const OrdersOption = (props: OrdersOptionParams) => {
  const [, t] = useLanguage();

  const [checkNotificationStatus, setCheckNotificationStatus] = useState({ open: false, checked: false })
  // Three tabs or four, decided in this render from the project's configs, or from what an earlier run kept until they load (`useCombinedTabs`):
  // the tabs are right from the first paint and nothing is read, nor re-rendered, after it.
  const { combined: combineTabs, pending: tabsPending } = useCombinedTabs()

  const ordersProps = {
    ...props,
    UIComponent: OrdersOptionUI,
    useDefualtSessionManager: true,
    asDashboard: true,
    // Connected unless the page says otherwise.
    isNetConnected: props.isNetConnected === undefined ? true : props.isNetConnected,
    combineTabs,
    tabsPending,
    // The controller encodes the search text (`encodeURI`) for what is not iOS: both platforms take that path,
    // since the SDK writes the query string raw and iOS read "%3460%" as "4", "60" and "%" (see `searchText.ts`).
    isIos: !SEARCH_ENCODES_PERCENT,
    // The app's one list of status names (decision H1): the card's status reads its `text`.
    orderStatus: orderStatusList(t),
    tabs: combineTabs ? [
      {
        key: 0,
        text: t('ACTIVE', 'Active'),
        tags: props?.orderGroupStatusCustom?.active ?? [0, 3, 4, 7, 8, 9, 13, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26],
        title: 'active',
      },
      {
        key: 1,
        text: t('COMPLETED', 'Completed'),
        tags: props?.orderGroupStatusCustom?.completed ?? [1, 11, 15],
        title: 'completed',
      },
      {
        key: 2,
        text: t('CANCELLED', 'Cancelled'),
        tags: props?.orderGroupStatusCustom?.cancelled ?? [2, 5, 6, 10, 12, 16, 17],
        title: 'cancelled',
      },
    ] :
      [
        {
          key: 0,
          text: t('PENDING', 'Pending'),
          tags: props?.orderGroupStatusCustom?.pending ?? [0, 13],
          title: 'pending'
        },
        {
          key: 1,
          text: t('IN_PROGRESS', 'In Progress'),
          tags: props?.orderGroupStatusCustom?.inProgress ?? [3, 4, 7, 8, 9, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26],
          title: 'inProgress',
        },
        {
          key: 2,
          text: t('COMPLETED', 'Completed'),
          tags: props?.orderGroupStatusCustom?.completed ?? [1, 11, 15],
          title: 'completed',
        },
        {
          key: 3,
          text: t('CANCELLED', 'Cancelled'),
          tags: props?.orderGroupStatusCustom?.cancelled ?? [2, 5, 6, 10, 12, 16, 17],
          title: 'cancelled',
        },
      ]
  };

  return (<>
    <OrderListGroups {...ordersProps} />
    {props?.checkNotification && (
      <NotificationSetting checkNotificationStatus={checkNotificationStatus}
        setCheckNotificationStatus={setCheckNotificationStatus} />
    )}
  </>);
};
