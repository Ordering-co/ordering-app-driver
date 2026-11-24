/**
 * The actions of an order whose view is a sheet over the screen that opens it:
 * the ones without a list of reasons. The others (a rejection, a failure,
 * "order not ready", a forced status) keep the whole screen.
 */
export const SHEET_ACTIONS = ['accept', 'arrivedToBusiness', 'pickupComplete', 'deliveryComplete'] as const;

export const isSheetAction = (action?: string | null): boolean =>
  !!action && (SHEET_ACTIONS as ReadonlyArray<string>).includes(action);
