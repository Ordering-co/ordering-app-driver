import React, { useMemo } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { contentStyles } from './styles'
import { OrderPair } from './OrderPair'
import { SectionTitle } from '../shared'

import { useLanguage } from '@components'

type Translate = (key: string, fallback?: string) => string

export interface VehicleLine {
  key: string
  label: string
  value: string
}

/**
 * The spot and the customer's vehicle of a curbside or drive thru order, as lines of a name and a value: the
 * spot when the order has one, and the vehicle's (with its title) when the order has one. The details
 * and the assign request's screen write them from these lines.
 */
export const orderVehicleLines = (order: any, t: Translate) => ({
  spot: order?.spot_number ? { key: 'spot', label: t('SPOT_NUMBER', 'Spot number'), value: order.spot_number } as VehicleLine : null,
  vehicleTitle: t('VEHICLE', 'Vehicle'),
  vehicle: order?.vehicle
    ? [
      { key: 'car_registration', label: t('CAR_REGISTRATION', 'Car registration'), value: order.vehicle.car_registration },
      { key: 'color', label: t('COLOR', 'Color'), value: order.vehicle.color },
      { key: 'model', label: t('MODEL', 'Model'), value: order.vehicle.model },
      { key: 'type', label: t('TYPE', 'Type'), value: order.vehicle.type }
    ] as VehicleLine[]
    : null
})

/** The order has a spot or a vehicle to show. */
export const hasSpotOrVehicle = (order: any) => !!order?.spot_number || !!order?.vehicle

/** The order's custom fields (`metafields`): none for an order without. */
export const orderCustomFields = (order: any): Array<{ id: number | string, key: string, value: string }> =>
  order?.metafields?.length > 0 ? order.metafields : []

/** The spot and the vehicle of an order, as the `vehicle` section (draw it for an order with `hasSpotOrVehicle`). */
export const OrderVehicle = ({ order }: { order: any }) => {
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const styles = useMemo(() => contentStyles(theme), [theme])
  const { spot, vehicle, vehicleTitle } = orderVehicleLines(order, t)
  return (
    <View style={styles.vehicle}>
      {!!spot && <OrderPair label={spot.label} value={spot.value} />}
      {!!vehicle && (
        <>
          <SectionTitle text={theme.native.components.order_details.base.address_title}>{vehicleTitle}</SectionTitle>
          {vehicle.map((line) => <OrderPair key={line.key} label={line.label} value={line.value} />)}
        </>
      )}
    </View>
  )
}
