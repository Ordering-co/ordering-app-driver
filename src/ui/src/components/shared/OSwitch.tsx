import React, { useEffect, useMemo, useRef } from 'react'
import { Animated, Pressable, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { themeControlHeight, themeMotion, themeOpacity, themeRadius, themeSpace } from '@/theme/helpers'

/**
 * An on / off switch drawn by the app (`components.switch`): a pill track with a round thumb that
 * slides, inside a touch box as tall as a control (`md`, 44) and as wide as `hit_width`. It is the
 * same on both platforms and reads only the theme: the colors (`on`, `off`, `thumb`) and the sizes
 * (`track_width`, `track_height`, `thumb_size`, `hit_width`). Only the thumb moves when it toggles,
 * so nothing around it shifts; with reduced motion (the theme's or the system's) it jumps.
 *
 *   <OSwitch value={on} onChange={setOn} accessibilityLabel={label} />
 */
interface Props {
  value: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  testID?: string
  accessibilityLabel?: string
}

export const OSwitch = ({ value, onChange, disabled, testID, accessibilityLabel }: Props) => {
  const theme: any = useTheme()
  const look = theme.native.components.switch.base
  const motion = themeMotion(theme, 'fast')
  const inset = themeSpace(theme, 'xxs')
  const travel = look.track_width - look.thumb_size - 2 * inset
  const position = useRef(new Animated.Value(value ? 1 : 0)).current

  useEffect(() => {
    if (motion.duration === 0) position.setValue(value ? 1 : 0)
    else Animated.timing(position, { toValue: value ? 1 : 0, duration: motion.duration, easing: motion.easing, useNativeDriver: true }).start()
  }, [value, motion.duration, position, motion.easing])

  const styles = useMemo(() => StyleSheet.create({
    hit: { width: look.hit_width, height: themeControlHeight(theme, 'md'), justifyContent: 'center', alignItems: 'flex-end' },
    track: {
      width: look.track_width,
      height: look.track_height,
      borderRadius: themeRadius(theme, 'full', { fixed: true }),
      padding: inset,
      justifyContent: 'center'
    },
    trackOn: { backgroundColor: look.on },
    trackOff: { backgroundColor: look.off },
    thumb: { width: look.thumb_size, height: look.thumb_size, borderRadius: themeRadius(theme, 'full', { fixed: true }), backgroundColor: look.thumb },
    disabled: { opacity: themeOpacity(theme, 'disabled') }
  }), [theme, look, inset])

  return (
    <Pressable
      testID={testID}
      accessibilityRole='switch'
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={[styles.hit, disabled && styles.disabled]}
    >
      <View style={[styles.track, value ? styles.trackOn : styles.trackOff]}>
        <Animated.View style={[styles.thumb, { transform: [{ translateX: position.interpolate({ inputRange: [0, 1], outputRange: [0, travel] }) }] }]} />
      </View>
    </Pressable>
  )
}

export default OSwitch
