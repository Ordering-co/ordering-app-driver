import React, { memo, useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Marker } from 'react-native-maps'
import { useTheme } from 'styled-components/native'

import { Icon } from '../shared'
import { nativeShadowStyle, themeRadius } from '@/theme/helpers'

/**
 * The app's marker over both maps (the Map tab's and an order's): a round disc in the marker's color
 * with a ring around it and a glyph in it, `components.map_marker` (sizes, ring, colors and shadow). The
 * glyph says who it stands for: a store, a customer, or `me`, the driver's own position (a smaller, dark
 * disc). `selected` is the marker whose card is open (the Map tab's tapped one; the order's map has none: its
 * destination is drawn at the normal size): a larger disc with a thicker ring, drawn above the others. It is a `Marker` of the map library and
 * keeps its press as the screen gives it. It never has a `title`: the library shows a square, unthemed info window
 * for any marker that has one, and what a stop says about itself is the app's own card (`MarkerCard`, `DestinationCard`).
 * The driver's own disc is not a button: no press, not tappable where the platform lets it (iOS), no callout, and it is
 * drawn under the stops' discs, so a tap on a stop over it is the stop's (Android hands a tap to the top marker only).
 */
export type MapMarkerParty = 'business' | 'customer' | 'me'

interface Props {
  latitude: number
  longitude: number
  party: MapMarkerParty
  /** The marker whose card is open. */
  selected?: boolean
  onPress?: () => void
  /** What a screen reader says of the disc (the driver's position, say): the marker's accessibility label, never an info window. */
  label?: string
}

const GLYPHS: Record<MapMarkerParty, string> = {
  business: 'storefront-outline',
  customer: 'person-outline',
  me: 'navigate-outline',
}

/**
 * Anchored at the disc's center, so the disc sits on its coordinate whatever its size: a selected
 * marker grows around that point and the others do not move. (The library's default is the bottom
 * center, where the tip of the old drop pin stood.)
 */
const CENTER = { x: 0.5, y: 0.5 }

/** What is drawn above what: the driver's own disc, then the stores' and customers', then the selected one. */
const LAYER = { me: 1, party: 2, selected: 3 }

/**
 * How long a marker's view is photographed after it changes. Android renders a custom marker view to a
 * bitmap (iOS' Google Maps does it too): while `tracksViewChanges` is on the map photographs the view
 * again and again, so it is on only until the change (the first paint, a selection, a theme) has been
 * laid out, and then off, which leaves the markers of the map alone as it moves and zooms.
 */
const SETTLE_MS = 1000

/** Everything a marker paints, from the theme and from what it is: one object per change, so a change is one comparison. */
const markerLook = (theme: any, party: MapMarkerParty, selected: boolean) => {
  const marker = theme.native.components.map_marker.base
  const me = party === 'me'
  const size = me ? marker.me_size : selected ? marker.selected_size : marker.size
  const shadow = nativeShadowStyle(marker.shadow)
  return {
    size,
    // The ring is part of the disc's size (the border sits inside the box).
    ring: selected ? marker.selected_ring_width : marker.ring_width,
    ringColor: marker.ring_color,
    background: me ? marker.me_color : marker.color,
    // The glyph keeps its share of the disc as the disc grows or shrinks.
    glyph: Math.round(marker.icon_size * size / marker.size),
    glyphColor: marker.icon_color,
    shadow,
    // Room around the disc for its shadow, so a bitmap of the view does not cut it.
    bleed: marker.shadow ? Math.ceil(marker.shadow.shadowRadius + Math.abs(marker.shadow.shadowOffset.height)) : 0,
  }
}

const markerStyles = (theme: any, look: ReturnType<typeof markerLook>) => StyleSheet.create({
  // The view the library photographs: the disc centered in its shadow's room, so the center of the view is the disc's.
  stage: {
    width: look.size + 2 * look.bleed,
    height: look.size + 2 * look.bleed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    width: look.size,
    height: look.size,
    borderRadius: themeRadius(theme, 'full', { fixed: true }),
    borderWidth: look.ring,
    borderColor: look.ringColor,
    backgroundColor: look.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...look.shadow,
  },
})

const MapMarkerView = ({ latitude, longitude, party, selected = false, onPress, label }: Props) => {
  const theme: any = useTheme()
  const isSelected = selected && party !== 'me'
  // The driver's own disc takes no tap: it is not a button.
  const isMe = party === 'me'
  const look = useMemo(() => markerLook(theme, party, isSelected), [theme, party, isSelected])
  const styles = useMemo(() => markerStyles(theme, look), [theme, look])

  // The look whose view the map has photographed: a new look is tracked until it has settled.
  const [settled, setSettled] = useState<unknown>(null)
  const tracking = settled !== look
  useEffect(() => {
    if (!tracking) return
    const timer = setTimeout(() => setSettled(look), SETTLE_MS)
    return () => clearTimeout(timer)
  }, [tracking, look])

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      anchor={CENTER}
      zIndex={isSelected ? LAYER.selected : isMe ? LAYER.me : LAYER.party}
      tracksViewChanges={tracking}
      onPress={isMe ? undefined : onPress}
      tappable={!isMe}
      accessibilityLabel={label}
    >
      <View style={styles.stage}>
        <View style={styles.disc} testID='map-marker-disc'>
          <Icon name={GLYPHS[party]} size={look.glyph} color={look.glyphColor} />
        </View>
      </View>
    </Marker>
  )
}

/** Memoized: a map that moves or zooms, or a card that opens, re-renders only the markers whose own props changed. */
export const MapMarker = memo(MapMarkerView)

export default MapMarker
