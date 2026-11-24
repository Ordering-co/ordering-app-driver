import type { AlertItem, AlertKind } from './alertQueue'

/** How many numbers the alert lists before it says "and N more". */
export const MAX_LISTED = 3

type Translate = (key: string, fallback: string) => string

/** Where the alert's button takes the driver. */
export type AlertAction =
  /** The details of the one order. */
  | { type: 'details', orderId: number | string }
  /** The Orders tab's list of orders (the one their status is in). */
  | { type: 'orders', status?: number }
  /** The Orders tab's assign requests. */
  | { type: 'requests' }
  /** The Messages tab. */
  | { type: 'messages' }

export interface AlertContent {
  title: string
  message: string
  /** The numbers of what the alert gathered (several of them): at most `MAX_LISTED`, then "and N more". */
  numbers?: string
  button?: { text: string, action: AlertAction }
}

const fill = (text: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((out, [name, value]) => out.replace(`_${name}_`, String(value)), text)

/**
 * The alert's texts and button for what it gathered. One thing says what it is and opens it: an order that is the driver's
 * says "Order #3504 has been assigned to you.", a request to take one says "Order #3504 needs a driver."; several say how many and list their numbers, newest last, and open the list they are in. Every
 * text is a whole phrase of the catalog with its placeholders, so each language words it as it needs.
 */
export const alertContent = (
  kind: AlertKind,
  items: AlertItem[],
  t: Translate,
  maskOrderId: (id?: number | string) => string,
  canOpenRequests: boolean
): AlertContent => {
  const first = items[0]
  const count = items.length
  const orderLabel = (item: AlertItem) => `#${maskOrderId(item.orderId)}`
  const label = (item: AlertItem) => item.groupId != null
    ? fill(t('GROUP_NUMBER', 'Group No. _group_id_'), { group_id: item.groupId })
    : orderLabel(item)

  let numbers: string | undefined
  if (count > 1) {
    const listed = items.slice(0, MAX_LISTED).map(label).join(', ')
    numbers = count > MAX_LISTED
      ? fill(t('LIST_AND_N_MORE', '_list_ and _count_ more'), { list: listed, count: count - MAX_LISTED })
      : listed
  }

  // The one thing an alert is about: an order's number, or a group's (a request for a group says the group, with its
  // orders when the packet says). The three phrases are translated where they are written, so each is a catalog key.
  const single = (order: string, group: string, groupWithCount: string) => {
    if (first?.groupId == null) return fill(order, { order_id: maskOrderId(first?.orderId) })
    return first.ordersCount
      ? fill(groupWithCount, { group_id: first.groupId, count: first.ordersCount })
      : fill(group, { group_id: first.groupId })
  }
  // An order that is the driver's (assigned to him) and a request to take one (a logistic assignment he may accept or reject) are
  // told in their own voice: each is its own set of three phrases.
  const assigned = () => single(
    t('ORDER_N_ASSIGNED_TO_YOU', 'Order #_order_id_ has been assigned to you.'),
    t('GROUP_N_ASSIGNED_TO_YOU', 'Group No. _group_id_ has been assigned to you.'),
    t('GROUP_N_ORDERS_ASSIGNED_TO_YOU', 'Group No. _group_id_ (_count_ orders) has been assigned to you.')
  )
  const needsDriver = () => single(
    t('ORDER_N_NEEDS_DRIVER', 'Order #_order_id_ needs a driver.'),
    t('GROUP_N_NEEDS_DRIVER', 'Group No. _group_id_ needs a driver.'),
    t('GROUP_N_ORDERS_NEEDS_DRIVER', 'Group No. _group_id_ (_count_ orders) needs a driver.')
  )
  const updated = () => single(
    t('ORDER_N_UPDATED', 'Order #_order_id_ has been updated.'),
    t('GROUP_N_UPDATED', 'Group No. _group_id_ has been updated.'),
    t('GROUP_N_ORDERS_UPDATED', 'Group No. _group_id_ with _count_ orders has been updated.')
  )

  const viewOrder = t('VIEW_ORDER', 'View order')
  const viewOrders = t('VIEW_ORDERS', 'View orders')
  const viewRequests = t('VIEW_REQUESTS', 'View requests')
  const details = { type: 'details', orderId: first?.orderId } as AlertAction
  const orders = { type: 'orders', status: items[items.length - 1]?.status } as AlertAction
  const requests = { type: 'requests' } as AlertAction

  switch (kind) {
    case 'message':
      return count === 1
        ? {
          title: t('NEW_MESSAGES_RECEIVED', 'New messages have been received!'),
          message: fill(t('ORDER_N_UNREAD_MESSAGES', 'Order #_order_id_ has unread messages.'), { order_id: maskOrderId(first?.orderId) }),
          button: { text: viewOrder, action: details }
        }
        : {
          title: t('NEW_MESSAGES_RECEIVED', 'New messages have been received!'),
          message: fill(t('ORDERS_UNREAD_MESSAGES_COUNT', '_count_ orders have unread messages.'), { count }),
          numbers,
          button: { text: t('VIEW_MESSAGES', 'View messages'), action: { type: 'messages' } }
        }
    case 'order_update':
      return count === 1
        ? {
          title: t('NEW_ORDERS_UPDATED', 'New orders have been updated!'),
          message: updated(),
          button: { text: viewOrder, action: details }
        }
        : {
          title: t('NEW_ORDERS_UPDATED', 'New orders have been updated!'),
          message: fill(t('ORDERS_UPDATED_COUNT', '_count_ orders have been updated.'), { count }),
          numbers,
          button: { text: viewOrders, action: orders }
        }
    case 'request':
      return count === 1
        ? {
          title: t('NEW_ORDER', 'New order!!'),
          message: needsDriver(),
          button: canOpenRequests ? { text: viewOrder, action: requests } : undefined
        }
        : {
          title: t('NEW_REQUESTS', 'New requests!!'),
          message: fill(t('NEW_REQUESTS_COUNT', '_count_ new requests'), { count }),
          numbers,
          button: canOpenRequests ? { text: viewRequests, action: requests } : undefined
        }
    case 'request_update':
      return count === 1
        ? {
          title: t('NEW_ORDERS_UPDATED', 'New orders have been updated!'),
          message: updated(),
          button: canOpenRequests ? { text: viewOrder, action: requests } : undefined
        }
        : {
          title: t('NEW_ORDERS_UPDATED', 'New orders have been updated!'),
          message: fill(t('REQUESTS_UPDATED_COUNT', '_count_ requests have been updated.'), { count }),
          numbers,
          button: canOpenRequests ? { text: viewRequests, action: requests } : undefined
        }
    default:
      return count === 1
        ? {
          title: t('NEW_ORDER', 'New order!!'),
          message: assigned(),
          button: { text: viewOrder, action: details }
        }
        : {
          title: t('NEW_ORDERS', 'New orders!!'),
          message: fill(t('NEW_ORDERS_COUNT', '_count_ new orders'), { count }),
          numbers,
          button: { text: viewOrders, action: orders }
        }
  }
}
