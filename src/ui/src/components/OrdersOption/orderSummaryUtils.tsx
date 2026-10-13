export const SUMMARY_ENABLED_PROJECTS = ['quickiedelivery', 'luisv4plus']

export interface OrderSummaryRow {
  count: number
  tips: number
}

export interface OrderSummaryResult {
  exitosa: OrderSummaryRow
  fallida: OrderSummaryRow
}

export interface BuildOrderSummaryOptions {
  successStatuses: number[]
  failedStatuses: number[]
}

// orders may hold plain orders OR nested cart-group entries [[cart_group_id, [orders]]].
export const flattenSummaryOrders = (orders: any[]): any[] => {
  const out: any[] = []
  for (const item of Array.isArray(orders) ? orders : []) {
    if (Array.isArray(item)) {
      const inner = item?.[0]?.[1]
      if (Array.isArray(inner)) out.push(...inner)
    } else if (item) {
      out.push(item)
    }
  }
  return out
}

/** Tip per order: use `cash` when present, else numeric `pay_data`. */
export const getOrderTip = (order: any): number => {
  const cash = order?.cash
  if (cash !== null && cash !== undefined && cash !== '') {
    const n = Number(cash)
    return isNaN(n) ? 0 : n
  }
  const payData = Number(order?.pay_data)
  return isNaN(payData) ? 0 : payData
}

export const buildOrderSummary = (
  orders: any[],
  { successStatuses, failedStatuses }: BuildOrderSummaryOptions,
): OrderSummaryResult => {
  const success = successStatuses ?? []
  const failed = failedStatuses ?? []
  const result: OrderSummaryResult = {
    exitosa: { count: 0, tips: 0 },
    fallida: { count: 0, tips: 0 },
  }
  for (const order of flattenSummaryOrders(orders)) {
    const status = order?.status
    if (success.includes(status)) {
      result.exitosa.count += 1
      result.exitosa.tips += getOrderTip(order)
    } else if (failed.includes(status)) {
      result.fallida.count += 1
    }
  }
  return result
}
