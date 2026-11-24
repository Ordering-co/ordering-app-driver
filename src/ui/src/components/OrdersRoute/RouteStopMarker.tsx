import React, { memo, useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Marker } from 'react-native-maps'
import { useTheme } from 'styled-components/native'

import { StopNumber, stopLook } from './StopNumber'

/**
 * A stop of the route on the map: its number in a disc (`StopNumber`), anchored at the disc's center so it sits on its coordinate
 * whatever its size. It follows the app's marker conventions (`MapMarker`): a `Marker` of the map library with no title (the library
 * draws a square, unthemed callout for any marker that has one: what a stop says about itself is the panel and the list), drawn above
 * the driver's own disc, the next stop above the others, and its view photographed by the map only while it settles. It is not a button:
 * the route has no card of its own over the map.
 */
interface Props {
  latitude: number
  longitude: number
  number: number
  next?: boolean
  /** What a screen reader says of it: "Stop 2 of 5, Pick up at Luna Pizza, order 1042, 1.90 km". */
  label: string
}

/** The driver's own disc is 1, the stops' 2, the next stop's 3. */
const LAYER = { party: 2, next: 3 }

/** How long the view is photographed after it changes (as `MapMarker`'s). */
const SETTLE_MS = 1000

const CENTER = { x: 0.5, y: 0.5 }

const RouteStopMarkerView = ({ latitude, longitude, number, next = false, label }: Props) => {
  const theme: any = useTheme()
  const look = useMemo(() => stopLook(theme, next), [theme, next])
  const styles = useMemo(() => StyleSheet.create({
    // The view the library photographs: the disc centered in its shadow's room, so the center of the view is the disc's.
    stage: {
      width: look.size + 2 * look.bleed,
      height: look.size + 2 * look.bleed,
      alignItems: 'center',
      justifyContent: 'center'
    }
  }), [look])

  const key = `${next}:${number}:${look.size}`
  const [settled, setSettled] = useState<string | null>(null)
  const tracking = settled !== key
  useEffect(() => {
    if (!tracking) return undefined
    const timer = setTimeout(() => setSettled(key), SETTLE_MS)
    return () => clearTimeout(timer)
  }, [tracking, key])

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      anchor={CENTER}
      zIndex={next ? LAYER.next : LAYER.party}
      tracksViewChanges={tracking}
      tappable={false}
      accessibilityLabel={label}
    >
      <View style={styles.stage}>
        <StopNumber number={number} next={next} floating testID='route-marker-disc' />
      </View>
    </Marker>
  )
}

export const RouteStopMarker = memo(RouteStopMarkerView)

export default RouteStopMarker
