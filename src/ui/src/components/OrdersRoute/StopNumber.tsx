import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { OText } from '../shared'
import { nativeShadowStyle, themeRadius } from '@/theme/helpers'

/**
 * A stop's number in its disc, the one mark of a stop of the route on the map and in the list: a round disc with a ring and the
 * number in it, from `components.map_marker` (`stop_size` and `stop_next_size`, the ring, the brand color and its text). The next stop
 * is the strong one: filled with the brand color, a larger disc, the number on it in the brand's text color; the others are the same
 * disc turned over: the surface for a fill, the brand color for the ring and the number. On the map it floats and keeps the map's shadow
 * (`floating`); in the list it is flat.
 */
interface Props {
  number: number
  /** The stop the driver goes to now. */
  next?: boolean
  /** Over the map: the map's shadow, which Identity does not remove. */
  floating?: boolean
  testID?: string
}

/** What a disc paints, from the theme and from whether it is the next stop. */
export const stopLook = (theme: any, next: boolean) => {
  const marker = theme.native.components.map_marker.base
  return {
    size: next ? marker.stop_next_size : marker.stop_size,
    // The ring is part of the disc's size (the border sits inside the box).
    ring: marker.ring_width,
    ringColor: next ? marker.ring_color : marker.color,
    background: next ? marker.color : marker.ring_color,
    digit: next ? marker.icon_color : marker.color,
    shadow: nativeShadowStyle(marker.shadow),
    // Room around the disc for its shadow, so a bitmap of the view (the map's marker) does not cut it.
    bleed: marker.shadow ? Math.ceil(marker.shadow.shadowRadius + Math.abs(marker.shadow.shadowOffset.height)) : 0
  }
}

const discStyles = (theme: any, look: ReturnType<typeof stopLook>, floating: boolean) => StyleSheet.create({
  disc: {
    width: look.size,
    height: look.size,
    borderRadius: themeRadius(theme, 'full', { fixed: true }),
    borderWidth: look.ring,
    borderColor: look.ringColor,
    backgroundColor: look.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...(floating ? look.shadow : null)
  }
})

export const StopNumber = ({ number, next = false, floating = false, testID }: Props) => {
  const theme: any = useTheme()
  const look = useMemo(() => stopLook(theme, next), [theme, next])
  const styles = useMemo(() => discStyles(theme, look, floating), [theme, look, floating])
  return (
    <View style={styles.disc} testID={testID ?? 'route-stop-number'}>
      <OText preset='label' color={look.digit}>{String(number)}</OText>
    </View>
  )
}

export default StopNumber
