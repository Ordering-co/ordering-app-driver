/**
 * What the accept / reject views know of a group of orders (same `cart_group_id`): the list hands them the
 * group's orders and the views speak for the group, not for its first order.
 */

/** A group has more than one order: a "group" of one (the others are in another tab) is that one order. */
export const isOrderGroup = (orders?: any[] | null): boolean => (orders?.length ?? 0) > 1;

/**
 * Every order of the group is for the same customer (a single phone to call makes sense, and the same person gets
 * the notification). The customer is known by its id; an order that has none is not known to be the same one.
 */
export const hasSingleCustomer = (orders?: any[] | null): boolean => {
  if (!orders?.length) return true;
  const ids = orders.map((order) => order?.customer_id ?? order?.customer?.id);
  return ids[0] != null && ids.every((id) => id === ids[0]);
};

/** An order that did not change, and what the API said about it. */
export interface StatusFailure {
  id: number;
  /** The API's error as it came (a message, a list of them, `{ message }`): worded by `apiErrorText`, never shown raw. */
  message?: any;
  errorCodes?: string[] | null;
  retryAfter?: number | null;
}

/** What a status change of a group did: every order changed, or the ones that did not. */
export interface GroupStatusOutcome {
  succeeded: boolean;
  failures: StatusFailure[];
}

/**
 * Reads what a handler answered, whichever handler it is: the list's own (`handleChangeOrderStatus`: one answer per order,
 * in the order of the ids, `null` for an order that failed, the answers with their `error` when asked `withDetails`, or the
 * text of an exception), the logistic one that saves the delivery time (one answer per order, `null` for a failure, `[]`
 * when it had nothing to send). An order changed when its answer is there and carries no `error`. An answer that cannot be
 * matched to the ids (a text, nothing, another count) says nothing of which orders changed: none is taken as changed, so
 * a retry sends them all again.
 */
export const readStatusAnswer = (answer: any, ids: number[] = []): GroupStatusOutcome => {
  const list: any[] = Array.isArray(answer) ? answer : []
  // A text among the answers is an exception's message (the list's handler returns it for a request that threw).
  const failed = (item: any) => item == null || item === false || typeof item === 'string' || (typeof item === 'object' && !!item.error)
  const reasonOf = (item: any) => (item && typeof item === 'object' ? item.result : typeof item === 'string' ? item : undefined)
  const matched = Array.isArray(answer) && list.length === ids.length
  const failures: StatusFailure[] = matched
    ? ids.flatMap((id, index) => failed(list[index])
      ? [{ id, message: reasonOf(list[index]), errorCodes: list[index]?.errorCodes ?? null, retryAfter: list[index]?.retryAfter ?? null }]
      : [])
    : ids.map((id) => ({ id, message: typeof answer === 'string' ? answer : reasonOf(list.find(failed)) }))
  return { succeeded: failures.length === 0, failures }
}

/** The statuses whose request carries where the driver is (the ones with a location check). */
const STATUSES_WITH_LOCATION = [3, 9, 11, 26]

/** A body built for a single order's request: a multipart one (a status photo), which the list's request cannot carry. */
const isMultipartBody = (body: any): boolean =>
  (typeof FormData !== 'undefined' && body instanceof FormData) || Array.isArray(body?._parts)

/**
 * The body the list's request takes (`handleChangeOrderStatus`, which sends it as JSON to each order): the fields of the
 * change, always with its status (a body without one is read as empty and the request goes out with none), and the place the
 * driver checked in for the steps that check it, as the order's own request sends it. `null` when it cannot be made: a
 * photo cannot travel that way, and it is never dropped silently.
 */
export const groupRequestBody = (status: any, body: any, location?: { latitude: number; longitude: number } | null) => {
  if (isMultipartBody(body)) return null
  const withStatus = body?.status == null && status != null ? { ...body, status } : { ...body }
  if (withStatus.status == null) return null
  if (location && STATUSES_WITH_LOCATION.includes(withStatus.status) && !withStatus.location) {
    return { ...withStatus, location: { lat: location.latitude, lng: location.longitude } }
  }
  return withStatus
}

/**
 * What a status change of the group asks of the list's own `handleChangeOrderStatus` (the controller's, which takes the ids
 * of the orders): one request for the group, or one per order when each carries its own delivery code. It says which orders
 * did not change (`readStatusAnswer`), so the screen that asked closes on success and stays, saying why, on a failure. A
 * request that throws is a failure of every order, not an exception for the screen. A body that cannot go through that
 * request (`groupRequestBody`) is a failure of every order too, and nothing is sent.
 */
export const updateGroupStatus = async ({
  ids,
  handleChangeOrderStatus,
  status,
  body,
  options
}: {
  ids?: number[];
  handleChangeOrderStatus?: (...args: any[]) => any;
  status: any;
  body: any;
  options?: any;
}): Promise<GroupStatusOutcome | undefined> => {
  if (!handleChangeOrderStatus) return undefined
  const sent = ids ?? []
  const requestBody = groupRequestBody(status, body, options?.location)
  if (!requestBody) return { succeeded: false, failures: sent.map((id) => ({ id })) }
  const deliveryPins = options?.deliveryPins
  try {
    if (!deliveryPins) {
      // The details of each answer carry the API's message, which a plain answer (`null`) does not.
      return readStatusAnswer(await handleChangeOrderStatus(status, sent, requestBody, { withDetails: true }), sent)
    }
    const responses = (await Promise.all(sent.map((id: number) =>
      handleChangeOrderStatus(status, [id], { ...requestBody, delivery_pin: deliveryPins[String(id)] }, { withDetails: true })
    ))).flat()
    options?.onStatusResponses?.(responses)
    return readStatusAnswer(responses, sent)
  } catch (error: any) {
    return { succeeded: false, failures: sent.map((id) => ({ id, message: error?.message })) }
  }
}
