type Translate = (key: string, fallback?: string) => string

/**
 * The name of an order's type (`order.delivery_type`), the same on every
 * screen; any type the app does not know is a delivery.
 */
export const orderTypeLabel = (t: Translate, type: number | string | null | undefined): string => {
  switch (Number(type)) {
    case 2: return t('PICKUP', 'Pickup')
    case 3: return t('EAT_IN', 'Eat in')
    case 4: return t('CURBSIDE', 'Curbside')
    case 5: return t('DRIVER_THRU', 'Driver thru')
    case 7: return t('CATERING_DELIVERY', 'Catering delivery')
    case 8: return t('CATERING_PICKUP', 'Catering pickup')
    case 9: return t('RESERVATION', 'Reservation')
    default: return t('DELIVERY', 'Delivery')
  }
}
