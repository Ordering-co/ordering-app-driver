/**
 * A stand-in for the `OrderListGroups` controller that behaves like it where the Orders tabs depend on it (read from
 * `src/@/components/src/components/OrderListGroups/index.js`):
 *
 *  - it keeps one list per key (`pending`, `inProgress`, `completed`, `cancelled`, `active`) and works on one of them
 *    (`currentTabSelected`); its loads (`loadOrders`, `loadMoreOrders`) act on that one only, and write the whole snapshot they
 *    started from, so two loads at once lose data;
 *  - an effect on `[currentTabSelected, isNetConnected]` loads a list that was not loaded (`fetched` falsy) with `newFetchCurrent`, which
 *    empties the list while it loads;
 *  - `loadOrders({ newFetch: true })` resets the pagination and the `fetched` of every list and keeps their orders;
 *  - an effect on its switch for combined tabs resets the list it works on (to `active` or `pending`), on mount and when the switch changes.
 *
 * Its "API" is `server.orders` (plain orders, newest id first when read): a list is the orders whose status the list holds, a page is
 * `pageSize` of them. Tests change an order's status on it, as another device would. Every request is recorded in `server.requests`.
 */
/* eslint-env jest */
const React = require('react')
const d3 = require('./d3OrdersDefaults')

const STATUSES = {
  active: [0, 3, 4, 7, 8, 9, 13, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26],
  pending: [0, 13],
  inProgress: [3, 4, 7, 8, 9, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26],
  completed: [1, 11, 15],
  cancelled: [2, 5, 6, 10, 12, 16, 17]
}
const KEYS = ['active', 'pending', 'inProgress', 'completed', 'cancelled']

const createServer = (orders = [], pageSize = 10) => {
  const server = {
    orders,
    pageSize,
    requests: [],
    /** The page `page` of the list `key`, as the API answers it. */
    /** A list whose answer waits for this promise: `gates.cancelled = new Promise(...)` holds the cancelled list's requests. */
    gates: {},
    /** While it is `true` a request is sent and never answered (one sent as the connection changed). */
    hang: false,
    page: (key, page) => {
      server.requests.push({ key, page })
      if (server.hang) return new Promise(() => {})
      const all = server.orders.filter((order) => STATUSES[key].includes(order.status)).sort((a, b) => b.id - a.id)
      const totalPages = Math.max(1, Math.ceil(all.length / server.pageSize))
      const answer = {
        result: all.slice((page - 1) * server.pageSize, page * server.pageSize).map((order) => ({ ...order })),
        pagination: { current_page: page, page_size: server.pageSize, total_pages: totalPages, total: all.length }
      }
      const gate = server.gates[key]
      return gate ? gate.then(() => answer) : Promise.resolve(answer)
    },
    /** What the requests were, as `key:page`. */
    asked: () => server.requests.map((request) => `${request.key}:${request.page}`)
  }
  return server
}

const structure = (key, pageSize) => ({
  loading: false,
  error: null,
  orders: [],
  defaultFilter: STATUSES[key],
  currentFilter: STATUSES[key],
  pagination: { currentPage: 1, pageSize, total: null }
})

/**
 * Builds the controller component. `handle` is filled with what a test needs to reach inside it (`setTab`: the controller moving its own
 * list, `state()`: its lists and the list it is on, `loads`: the loads it was asked for).
 */
const createFakeController = (server, handle = {}) => {
  handle.loads = []
  const Fake = (props) => {
    const { UIComponent, isNetConnected = true } = props
    const [combineTabs, setCombineTabsState] = React.useState(!!props.combineTabs)
    const keys = combineTabs ? ['active', 'completed', 'cancelled'] : ['pending', 'inProgress', 'completed', 'cancelled']
    const [ordersGroup, setOrdersGroup] = React.useState(() => Object.fromEntries(KEYS.map((key) => [key, structure(key, server.pageSize)])))
    // The real controller always starts on its first list; a test may start it on another one (the screen opens on the list it is given).
    const [currentTabSelected, setCurrentTabSelected] = React.useState(props.currentTabSelected ?? (combineTabs ? 'active' : 'pending'))
    handle.setTab = setCurrentTabSelected
    handle.state = () => ({ ordersGroup, currentTabSelected })

    const loadOrders = async ({ newFetch, newFetchCurrent } = {}, options = {}) => {
      handle.loads.push({ tab: currentTabSelected, newFetch: !!newFetch, newFetchCurrent: !!newFetchCurrent, options })
      let group = ordersGroup
      if (newFetch) {
        keys.forEach((key) => {
          group = { ...group, [key]: { ...structure(key, server.pageSize), currentFilter: group[key].currentFilter, orders: group[key].orders } }
        })
      } else if (newFetchCurrent) {
        group = { ...group, [currentTabSelected]: structure(currentTabSelected, server.pageSize) }
      }
      setOrdersGroup({ ...group, [currentTabSelected]: { ...group[currentTabSelected], loading: true } })
      const { result, pagination } = await server.page(currentTabSelected, 1)
      setOrdersGroup({
        ...group,
        [currentTabSelected]: {
          ...group[currentTabSelected],
          loading: false,
          orders: result,
          error: null,
          fetched: true,
          pagination: {
            ...group[currentTabSelected].pagination,
            currentPage: pagination.current_page,
            pageSize: pagination.page_size,
            totalPages: pagination.total_pages,
            total: pagination.total
          }
        }
      })
    }

    const loadMoreOrders = async () => {
      handle.loads.push({ tab: currentTabSelected, more: true })
      setOrdersGroup({ ...ordersGroup, [currentTabSelected]: { ...ordersGroup[currentTabSelected], loading: true } })
      const { result, pagination } = await server.page(currentTabSelected, ordersGroup[currentTabSelected].pagination.currentPage + 1)
      setOrdersGroup({
        ...ordersGroup,
        [currentTabSelected]: {
          ...ordersGroup[currentTabSelected],
          loading: false,
          orders: [...ordersGroup[currentTabSelected].orders, ...result].sort((a, b) => b.id - a.id),
          error: null,
          pagination: {
            ...ordersGroup[currentTabSelected].pagination,
            currentPage: pagination.current_page,
            pageSize: pagination.page_size,
            totalPages: pagination.total_pages,
            total: pagination.total
          }
        }
      })
    }

    // The controller's own effects (the same dependencies).
    React.useEffect(() => {
      if (!ordersGroup[currentTabSelected]?.fetched && isNetConnected && currentTabSelected !== 'logisticOrders') {
        loadOrders({ newFetchCurrent: true })
      }
    }, [currentTabSelected, isNetConnected])
    const mounted = React.useRef(false)
    React.useEffect(() => {
      // On mount the real one sets the list it starts on (no change); here that would undo the list a test started on.
      if (mounted.current) setCurrentTabSelected(combineTabs ? 'active' : 'pending')
      mounted.current = true
    }, [combineTabs])
    const tellSwitch = (value) => {
      if (props.setCombineTabsState) props.setCombineTabsState(value)
      setCombineTabsState(value)
    }

    const handleChangeOrderStatus = async (status, ids) => {
      server.orders.forEach((order) => { if (ids.includes(order.id)) order.status = status })
      return ids.map((id) => ({ id }))
    }

    if (!UIComponent) return null
    return React.createElement(UIComponent, {
      ...d3.orderListGroupsDefaults,
      ...props,
      UIComponent: undefined,
      ordersGroup,
      setOrdersGroup,
      currentTabSelected,
      setCurrentTabSelected,
      setCombineTabsState: tellSwitch,
      loadOrders,
      loadMoreOrders,
      handleChangeOrderStatus: props.handleChangeOrderStatus ?? handleChangeOrderStatus
    })
  }
  return Fake
}

module.exports = { createServer, createFakeController, STATUSES }
