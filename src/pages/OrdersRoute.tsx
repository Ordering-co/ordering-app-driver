import React from 'react'
import { SafeAreaContainerLayout, OrdersRoute as OrdersRouteScreen } from '@ui'

interface Props {
  navigation: any
  route: any
}

/** The driver's route over the orders in progress: the stops on the map, the next one in a panel under it. A screen of the stack. */
const OrdersRoute = ({ navigation }: Props) => (
  <SafeAreaContainerLayout>
    <OrdersRouteScreen navigation={navigation} />
  </SafeAreaContainerLayout>
)

export default OrdersRoute
