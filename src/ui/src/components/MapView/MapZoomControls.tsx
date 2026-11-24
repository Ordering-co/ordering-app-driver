import React, { RefObject, useCallback, useRef } from 'react'
import { View } from 'react-native'
import type MapView from 'react-native-maps'
import { useTheme } from 'styled-components/native'
import { StyleSheet } from 'react-native'

import { useLanguage } from '@components'
import { OFab } from '../shared'
import { themeSpace, themeVisible } from '@/theme/helpers'

/**
 * The zoom of the app's two maps (the Map tab and the order's driver map): the library's own zoom
 * buttons are turned off on both (`zoomControlEnabled={false}`) and these are drawn instead, so
 * the same role looks the same on both maps and on both platforms. `useMapZoom` keeps the
 * region the map last settled on and zooms by halving or doubling its deltas; `MapZoomControls`
 * is the pair of buttons (`visibility.map.zoom_controls`), laid out by the map that shows them.
 */
export interface MapRegion {
  latitude?: number
  longitude?: number
  latitudeDelta: number
  longitudeDelta: number
}

export const useMapZoom = (mapRef: RefObject<MapView | null>, initialRegion: MapRegion) => {
  const region = useRef<MapRegion>(initialRegion)

  /** For the map's `onRegionChangeComplete`, and for a host that moves the region itself (the Map tab's start). */
  const setRegion = useCallback((next: MapRegion) => {
    region.current = next
  }, [])

  const zoomBy = useCallback((factor: number) => {
    // Until the map reports where it is, there is nothing to zoom from.
    if (region.current.latitude === undefined || region.current.longitude === undefined) return
    mapRef.current?.animateToRegion({
      ...region.current,
      latitudeDelta: region.current.latitudeDelta * factor,
      longitudeDelta: region.current.longitudeDelta * factor,
    } as any)
  }, [mapRef])

  const zoomIn = useCallback(() => zoomBy(1 / 2), [zoomBy])
  const zoomOut = useCallback(() => zoomBy(2), [zoomBy])

  return { region, setRegion, zoomIn, zoomOut }
}

interface Props {
  onZoomIn: () => void
  onZoomOut: () => void
  style?: any
}

export const MapZoomControls = ({ onZoomIn, onZoomOut, style }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const styles = React.useMemo(() => StyleSheet.create({
    column: { gap: themeSpace(theme, 'sm') },
  }), [theme])
  if (!themeVisible(theme, 'map.zoom_controls')) return null
  return (
    <View style={[styles.column, style]} testID='map-zoom-controls'>
      <OFab iconName='add' onPress={onZoomIn} accessibilityLabel={t('ZOOM_IN', 'Zoom in')} />
      <OFab iconName='remove' onPress={onZoomOut} accessibilityLabel={t('ZOOM_OUT', 'Zoom out')} />
    </View>
  )
}
