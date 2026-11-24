import { useLanguage, useUtils } from '@components';

/**
 * How an order is paid, for its details: the text the app has
 * always written (the methods, a cash one with the bill the customer pays with),
 * and its pieces for a block that writes them apart.
 */
export const useOrderPayment = (order: any) => {
  const [, t] = useLanguage();
  const [{ parsePrice }] = useUtils();

  const walletName: any = {
    cash: t('CASH_WALLET', 'Cash Wallet'),
    credit_point: t('CREDITS_POINTS_WALLET', 'Credit Points Wallet'),
  };

  const payments: Array<any> = order?.payment_events?.filter((item: any) => item.event === 'payment') ?? [];
  const hasEvents = order?.payment_events?.length > 0;
  // An order with no payment method (the assign request's order may come without it) has none to name: the app
  // writes nothing then (as the order's copied text does), never the word "undefined".
  const hasMethod = !!(order?.paymethod?.gateway || order?.paymethod?.name);
  const orderMethod: string = hasMethod ? t(order?.paymethod?.gateway?.toUpperCase(), order?.paymethod?.name) ?? '' : '';
  const change = t('CASH_CHANGE_OF', 'Change of :amount:').replace(':amount:', parsePrice(order?.cash));

  /** A payment's method, without the bill the customer pays with. */
  const methodName = (payment: any) =>
    payment?.data?.wallet_currency
      ? walletName[payment?.data?.wallet_currency]
      : payment?.paymethod?.gateway
        ? t(payment?.paymethod?.gateway?.toUpperCase(), payment?.paymethod?.name)
        : orderMethod;

  const isCashPayment = (payment: any) =>
    !payment?.data?.wallet_currency && payment?.paymethod?.gateway === 'cash';

  /** The methods in one line, as the app has always written them. */
  const text: string = hasEvents
    ? payments.map((payment: any) =>
      isCashPayment(payment) && order?.cash > 0 ? `${methodName(payment)} (${change})` : methodName(payment)
    ).filter(Boolean).join(', ')
    : `${orderMethod}${order?.paymethod?.gateway === 'cash' && order?.cash ? ` (${change})` : ''}`;

  /** The driver collects the whole order in cash: its only payment is cash. */
  const isCashOnly: boolean = hasEvents
    ? payments.length > 0 && payments.every(isCashPayment)
    : order?.paymethod?.gateway === 'cash';

  return {
    /** How many payments the order has (the title is plural with more than one). */
    count: payments.length,
    text,
    /** The methods without the customer's bill, in one line. */
    methods: (hasEvents ? payments.map(methodName) : [orderMethod]).filter(Boolean).join(', '),
    isCashOnly,
    /** "Change of $50.00": the bill the customer pays a cash order with, or null. */
    change: isCashOnly && order?.cash > 0 ? change : null,
    total: parsePrice(order?.summary?.total ?? order?.total),
  };
};
