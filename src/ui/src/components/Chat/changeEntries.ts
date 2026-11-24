import { capitalize } from '../../utils'

/** The language function the entries are worded with. */
type Translate = (key: string, fallback?: string) => string

/** The attributes whose value is a number of minutes ("0 to 20 Minutes"). */
const MINUTES_ATTRIBUTES = ['prepared_in', 'delivered_in', 'delivery_datetime']
/** The attributes the driver manager's manual assignment writes: their own phrase and no status names. */
const MANUAL_ATTRIBUTES = ['manual_driver_assignment_comment', 'manual_driver_assignment_author_id']
/**
 * The attributes whose change the app has words for. Any other attribute of the API's logbook ("distance", "summary.refunded",
 * the delivery PIN's state…) is skipped, never drawn as the raw code it is.
 */
const WORDED_ATTRIBUTES = [
  'status', 'logistic_status', 'driver_id', 'driver_group_id', 'delivery_position', 'reject_reason', 'external_id',
  ...MINUTES_ATTRIBUTES, ...MANUAL_ATTRIBUTES,
]

/** No value: nothing, `false` (the API's "no value" for a number), an empty text or the word of a missing one. */
export const isEmptyChangeValue = (value: unknown): boolean =>
  value === undefined || value === null || value === false || (Array.isArray(value) && value.length === 0) ||
  (typeof value === 'string' && ['', 'undefined', 'null', 'false'].includes(value.trim()))

/** The names of the order's statuses, by id: the only values that are read as a status (the `status` attribute). */
export const orderStatusNames = (t: Translate): Record<number, string> => ({
  0: t('ORDER_STATUS_PENDING', 'Order status pending'),
  1: t('ORDERS_COMPLETED', 'Order completed'),
  2: t('ORDER_REJECTED', 'Order rejected'),
  3: t('ORDER_STATUS_IN_BUSINESS', 'Order status in business'),
  4: t('ORDER_READY', 'Order ready'),
  5: t('ORDER_REJECTED_RESTAURANT', 'Order rejected by restaurant'),
  6: t('ORDER_STATUS_CANCELLEDBYDRIVER', 'Order status cancelled by driver'),
  7: t('ORDER_STATUS_ACCEPTEDBYRESTAURANT', 'Order status accepted by restaurant'),
  8: t('ORDER_CONFIRMED_ACCEPTED_BY_DRIVER', 'Order confirmed accepted by driver'),
  9: t('ORDER_PICKUP_COMPLETED_BY_DRIVER', 'Order pickup completed by driver'),
  10: t('ORDER_PICKUP_FAILED_BY_DRIVER', 'Order pickup failed by driver'),
  11: t('ORDER_DELIVERY_COMPLETED_BY_DRIVER', 'Order delivery completed by driver'),
  12: t('ORDER_DELIVERY_FAILED_BY_DRIVER', 'Order delivery failed by driver'),
  13: t('PREORDER', 'Preorder'),
  14: t('ORDER_NOT_READY', 'Order not ready'),
  15: t('ORDER_PICKEDUP_COMPLETED_BY_CUSTOMER', 'Order picked up completed by customer'),
  16: t('ORDER_STATUS_CANCELLED_BY_CUSTOMER', 'Order status cancelled by customer'),
  17: t('ORDER_NOT_PICKEDUP_BY_CUSTOMER', 'Order not picked up by customer'),
  18: t('ORDER_DRIVER_ALMOST_ARRIVED_BUSINESS', 'Order driver almost arrived to business'),
  19: t('ORDER_DRIVER_ALMOST_ARRIVED_CUSTOMER', 'Order driver almost arrived to customer'),
  20: t('ORDER_CUSTOMER_ALMOST_ARRIVED_BUSINESS', 'Order customer almost arrived to business'),
  21: t('ORDER_CUSTOMER_ARRIVED_BUSINESS', 'Order customer arrived to business'),
  22: t('ORDER_LOOKING_FOR_DRIVER', 'Order looking for driver'),
  23: t('ORDER_DRIVER_ON_WAY', 'Driver on way'),
  24: t('ORDER_DRIVER_WAITING_FOR_ORDER', 'Driver waiting for order'),
  25: t('ORDER_ACCEPTED_BY_DRIVER_COMPANY', 'Accepted by driver company'),
  26: t('ORDER_DRIVER_ARRIVED_CUSTOMER', 'Driver arrived to customer'),
})

const logisticTag = (status: unknown, t: Translate): string | undefined => {
  const tags: Record<string, string> = {
    0: t('PENDING', 'Pending'),
    1: t('IN_PROGRESS', 'In progress'),
    2: t('IN_QUEUE', 'In queue'),
    3: t('EXPIRED', 'Expired'),
    4: t('RESOLVED', 'Resolved'),
  }
  return tags[String(status)]
}

/** The words of one side of a change, or undefined when it has none (no value, or a value the app cannot word). */
const wordedValue = (attribute: string, value: unknown, statuses: Record<number, string>, t: Translate): string | undefined => {
  if (isEmptyChangeValue(value)) return undefined
  // A status id is a status's name only for the status attribute; a position or a reason is shown as it is.
  if (attribute === 'status') return statuses[parseInt(String(value), 10)]
  if (attribute === 'logistic_status') return logisticTag(value, t)
  if (typeof value === 'object') return undefined
  return String(value)
}

/**
 * What a change of the order says in the thread ("Order Status Changed from A to B"), or undefined when the entry
 * has nothing to say (no attribute, an attribute the app has no words for, a change with neither value): the thread
 * then leaves it out. A side with no value drops out of the phrase ("Order Reject reason set to …" /
 * "Order Reject reason removed"); "undefined", "null" and "false" are never printed as a value.
 */
export const describeChange = (message: any, t: Translate): string | undefined => {
  const change = message?.change
  const attribute: string | undefined = change?.attribute
  if (!attribute || !WORDED_ATTRIBUTES.includes(attribute)) return undefined

  if (attribute === 'driver_id') {
    return isEmptyChangeValue(change.new)
      ? t('DRIVER_UNASSIGNED', 'Driver unassigned')
      : `${message?.driver?.name ?? ''} ${message?.driver?.lastname ?? ''} ${t('WAS_ASSIGNED_AS_DRIVER', 'Was assigned as driver')} ${message?.comment ? message.comment.length : ''}`.replace(/\s+/g, ' ').trim()
  }

  const name = t(attribute.toUpperCase(), capitalize(attribute.replace(/_/g, ' ')))
  const statuses = orderStatusNames(t)
  const isMinutes = MINUTES_ATTRIBUTES.includes(attribute)
  // A minutes attribute has been 0 before it was ever set.
  const from = isMinutes && isEmptyChangeValue(change.old) && !isEmptyChangeValue(change.new) ? '0' : wordedValue(attribute, change.old, statuses, t)
  const to = wordedValue(attribute, change.new, statuses, t)

  if (from === undefined && to === undefined) return undefined
  // A value the app cannot word (a status it has no name for) leaves no entry: it is not an empty value.
  const unworded = (value: unknown, worded?: string) => !isEmptyChangeValue(value) && worded === undefined
  if (unworded(change.old, from) || unworded(change.new, to)) return undefined
  if (to === undefined) return t('ORDER_ATTRIBUTE_REMOVED', 'Order _attribute_ removed').replace('_attribute_', name)
  if (from === undefined) return t('ORDER_ATTRIBUTE_SET_TO', 'Order _attribute_ set to _to_').replace('_attribute_', name).replace('_to_', () => to)

  if (attribute === 'driver_group_id' || MANUAL_ATTRIBUTES.includes(attribute)) {
    return t('ORDER_ATTRIBUTE_CHANGED_FROM_TO', 'Order _attribute_ changed from _from_ to _to_.')
      .replace('_attribute_', name)
      .replace('_from_', () => from)
      .replace('_to_', () => to)
  }
  const verb = t('CHANGED_FROM', 'Changed from')
  const tail = isMinutes ? ` ${t('MINUTES', 'Minutes')}` : ''
  return `${t('ORDER', 'Order')} ${name} ${verb} ${from} ${t('TO', 'to')} ${to}${tail}`
}
