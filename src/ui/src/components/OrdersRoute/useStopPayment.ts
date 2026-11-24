import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { themeVisible } from '@/theme/helpers'
import { useOrderPayment } from '../../hooks/useOrderPayment'
import { paymentChip } from '../PreviousOrders/orderCardData'

/**
 * What the driver collects at a customer's door, as the order card says it by the details' one rule (`useOrderPayment`): "Paid",
 * "Collect $24.50 in cash" (the total only where the project shows totals to the driver, `confirmation.order.total`; else the card's
 * own "Collect in cash"), or nothing when the order says nothing of its payment (or is paid at the door by card, which the card does
 * not say either).
 */
export const useStopPayment = (order: any): string => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const payment = useOrderPayment(order)
  const chip = paymentChip(order, payment.isCashOnly)
  if (chip === 'paid') return t('PAID', 'Paid')
  if (chip !== 'collect') return ''
  const hasTotal = (order?.summary?.total ?? order?.total) != null
  return themeVisible(theme, 'confirmation.order.total') && hasTotal
    ? t('ROUTE_COLLECT_AMOUNT', 'Collect :amount: in cash').replace(':amount:', payment.total)
    : t('COLLECT_IN_CASH', 'Collect in cash')
}
