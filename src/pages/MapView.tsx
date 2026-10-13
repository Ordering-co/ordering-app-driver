import React from 'react'
import { MapView as MapViewController } from '@ui'

const MapView = ({ navigation }: any) => {
  const props = {
    navigation,
    onNavigationRedirect: (page: string, params: any) => {
      if (!page) return
      navigation.navigate(page, params)
    },
    isDeliveryApp: true
  }
  return <MapViewController {...props} />
}

export default MapView
