import { useCallback, useRef, useState } from 'react';

import { useLanguage } from '@components';
import { updateGroupStatus } from '../components/AcceptOrRejectOrder/groupOrders';
import { statusBeforeQueue } from '../components/AcceptOrRejectOrder/offlineChange';
import { apiErrorText } from '../utils';

interface UseGroupStatusUpdateParams {
  /** The orders the screen changes. */
  ids?: number[];
  /**
   * The orders themselves (a group's, or the one order): what a change saved offline registers, with its new status.
   * Only the ones in `ids` are read.
   */
  orders?: any[];
  /** The request the status change makes (the list's own, or the one that saves the delivery time of a request). */
  handleChangeOrderStatus?: (...args: any[]) => any;
  /** Called when every order changed. */
  onSucceeded?: () => void;
}

/** What a failed attempt says: the text under the action, and what the delivery code needs to know of the first order. */
interface GroupStatusError {
  text: string;
  errorCodes: string[] | null;
  retryAfter: number | null;
}

/**
 * The status change that the accept / reject view asks of a screen that does not own the order (a list, a request of the
 * logistic): the request, what a failure of it says, and which orders are still to change.
 *
 * Success means every order changed. A failure keeps the view open, with the API's message as its inline error (or how
 * many orders did not change, when some did), and the next try sends only the orders that did not change: a request
 * repeated for an order that already changed would be refused or, worse, applied twice. The handlers all take the ids
 * of the orders they change, so the retry can be narrowed.
 */
export const useGroupStatusUpdate = ({ ids, orders, handleChangeOrderStatus, onSucceeded }: UseGroupStatusUpdateParams) => {
  const [, t] = useLanguage();
  const [error, setError] = useState<GroupStatusError | null>(null);
  // The orders that did not change yet: none until an attempt fails.
  const pendingRef = useRef<number[] | null>(null);
  // The screen's latest request and ids, as a callback of the view (kept by it between renders) sees them.
  const latest = useRef({ ids, orders, handleChangeOrderStatus, onSucceeded });
  latest.current = { ids, orders, handleChangeOrderStatus, onSucceeded };
  // Which view the hook is serving: it moves on every `reset` (a view that opens, closes or finishes). A request answers for
  // the view it started in, and a view that is gone, or replaced by another, must neither be closed nor given an error by it.
  const generationRef = useRef(0);

  /** Forgets a failed attempt: a new view starts from every order and no error. */
  const reset = useCallback(() => {
    generationRef.current += 1;
    pendingRef.current = null;
    setError(null);
  }, []);

  /**
   * Sends the status change. Answers `true` (every order changed), `false` (some did not: the view says why), `undefined`
   * (nothing to ask, or the view it was asked in is gone: its answer is of no one) and, for a change to save offline
   * (`options.dataToSave`: nothing is sent), the orders as they will be once it syncs, new status first.
   */
  const update = useCallback(async (status: any, body: any, options?: any) => {
    const { ids: all = [], orders: known, handleChangeOrderStatus: request, onSucceeded: done } = latest.current;

    // Saved offline, not sent: the handler of a list has no offline mode, the screen queues the change and registers these.
    if (options?.dataToSave) {
      return (known ?? [])
        .filter((order) => order?.id != null && all.includes(order.id))
        .map((order) => ({ ...order, ...options.dataToSave, oldStatus: statusBeforeQueue(order) }));
    }

    const generation = generationRef.current;
    const outcome = await updateGroupStatus({
      ids: pendingRef.current ?? all,
      handleChangeOrderStatus: request,
      status,
      body,
      options
    });
    // The view this started in was dismissed (or another one opened) while the request ran: a change that did happen is
    // already told to the list by the request itself (the screen's own wrapper of the handler reloads it), and neither the
    // close nor the error of this answer belongs to the view that is there now.
    if (generation !== generationRef.current) return undefined;
    if (!outcome) return undefined;

    if (outcome.succeeded) {
      reset();
      done?.();
      return true;
    }

    const { failures } = outcome;
    pendingRef.current = failures.map((failure) => failure.id);
    // The reason of the first order that failed; with none given (the request that saves a time answers only `null`) a plain text.
    const reason = failures.find((failure) => failure.message != null)?.message;
    const why = reason != null ? apiErrorText(reason, t) : t('THE_CHANGE_WAS_NOT_SAVED', 'The change was not saved. Try again.');
    // Some orders changed: the view stays for the others, and says how many.
    const someChanged = failures.length < all.length;
    const text = someChanged
      ? [t('ORDERS_NOT_CHANGED', 'Orders that did not change: _count_').replace('_count_', String(failures.length)), reason != null && why]
        .filter(Boolean).join(' · ')
      : why;
    // The code's own error (a refused delivery code, a wait before the next try) is read for the order the view is about.
    const first = failures.find((failure) => failure.id === all[0]);
    setError({ text, errorCodes: first?.errorCodes ?? null, retryAfter: first?.retryAfter ?? null });
    return false;
  }, [t, reset]);

  return {
    update,
    reset,
    error: error?.text,
    errorCodes: error?.errorCodes ?? null,
    retryAfter: error?.retryAfter ?? null
  };
};
