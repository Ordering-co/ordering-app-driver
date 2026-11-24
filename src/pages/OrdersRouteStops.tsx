import React from 'react'
import { SafeAreaContainerLayout, OrdersRouteStops as OrdersRouteStopsScreen } from '@ui'

interface Props {
  navigation: any
  route: any
}

/** All the stops of the route as a timeline, one step from the route's map. A screen of the stack. */
const OrdersRouteStops = ({ navigation }: Props) => (
  <SafeAreaContainerLayout>
    <OrdersRouteStopsScreen navigation={navigation} />
  </SafeAreaContainerLayout>
)

export default OrdersRouteStops
