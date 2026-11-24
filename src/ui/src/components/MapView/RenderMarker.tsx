import React, { memo, useCallback } from 'react'

import { MapMarker } from './MapMarker'
import { RenderMarkerParams } from '../../types'

/** The marker the driver tapped: a store's or a customer's, by the id its group is kept under. */
export type MarkerKey = { customer: boolean, id: number | string }

type Props = RenderMarkerParams & {
  /** The marker whose card is open: it is drawn larger and above the others. */
  selected?: boolean
  /** Tells the map which marker was tapped: it opens its card. */
  onSelect?: (key: MarkerKey) => void
}

/**
 * A store's or a customer's marker of the Map tab (`MapMarker`). Tapping it centers the map on it and
 * tells the screen (`onSelect`), which draws the marker's card at the bottom: the map library's own
 * callout bubble is not used.
 */
const RenderMarkerView = (props: Props) => {
  const {
    marker,
    customer,
    initialPosition,
    setLocationSelected,
    onSelect,
    selected
  } = props

  const coordinateLat = (customer
    ? typeof marker?.customer?.location?.lat === 'number' && !Number.isNaN(marker?.customer?.location?.lat)
      ? marker?.customer?.location?.lat
      : 0
    : typeof marker?.business?.location?.lat === 'number' && !Number.isNaN(marker?.business?.location?.lat)
      ? marker?.business?.location?.lat
      : 0) ?? (initialPosition?.latitude || 0)
  const coordinateLng = (customer
    ? typeof marker?.customer?.location?.lng === 'number' && !Number.isNaN(marker?.customer?.location?.lng)
      ? marker?.customer?.location?.lng
      : 0
    : typeof marker?.business?.location?.lng === 'number' && !Number.isNaN(marker?.business?.location?.lng)
      ? marker?.business?.location?.lng
      : 0) ?? (initialPosition?.longitude || 0)

  const markerId = customer ? marker?.customer_id : marker?.business_id
  const handlePress = useCallback(() => {
    setLocationSelected?.({
      latitude: coordinateLat,
      longitude: coordinateLng
    })
    onSelect?.({ customer: !!customer, id: markerId })
  }, [setLocationSelected, onSelect, coordinateLat, coordinateLng, customer, markerId])

  return (
    <MapMarker
      latitude={coordinateLat}
      longitude={coordinateLng}
      party={customer ? 'customer' : 'business'}
      selected={selected}
      onPress={handlePress}
    />
  )
}

/** Memoized with the marker's own props: the map's region changing does not touch it. */
export const RenderMarker = memo(RenderMarkerView)
