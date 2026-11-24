import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  ScrollView,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
} from 'react-native'
import { useTheme } from 'styled-components/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { OFab } from '../shared'
import { themeColor, themeGutter, themeMotion, themeSpace } from '@/theme/helpers'

/**
 * A chat image, full screen: over the theme's `inverse_surface` (black), under
 * the status bar (light, also on Android, where the dialog is drawn behind the
 * bars), with a close button and closed by dragging it down. On iOS it is
 * zoomed with two fingers (the scroll view's own zoom); Android has no zoom.
 */
type ImageViewerProps = {
  uri: string | null
  closeLabel: string
  onClose: () => void
}

/** Dragged down past this share of the screen (or thrown), the viewer closes. */
const CLOSE_SHARE = 0.18
const CLOSE_SPEED = 1.2
const MAX_ZOOM = 4
/** What is left of the backdrop when the image is dragged half the screen down. */
const DRAGGED = { share: 0.5, backdrop: 0.2 }

export const ImageViewer = ({ uri, closeLabel, onClose }: ImageViewerProps) => {
  const theme: any = useTheme()
  const { top } = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const drag = useRef(new Animated.Value(0)).current
  const zoomed = useRef(false)
  const [isZoomed, setIsZoomed] = useState(false)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    if (!uri) return
    drag.setValue(0)
    zoomed.current = false
    setIsZoomed(false)
  }, [uri, drag])

  const looks = useMemo(() => StyleSheet.create({
    fill: { flex: 1 },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: themeColor(theme, 'inverse_surface') },
    zoom: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
    image: { width, height },
    close: {
      position: 'absolute',
      top: top + themeSpace(theme, 'sm'),
      right: themeGutter(theme),
    },
  }), [theme, top, width, height])

  const pan = useMemo(() => {
    const settle = () => Animated.timing(drag, { toValue: 0, ...themeMotion(theme, 'fast'), useNativeDriver: true }).start()
    return PanResponder.create({
      // The drag that closes: one finger going down, the image not zoomed. Taken
      // at the touch's start: React Native's Modal takes it there itself, and
      // what is inside the responder cannot take it from it on a move.
      onStartShouldSetPanResponder: () => !zoomed.current,
      onPanResponderMove: (_event, gesture) => {
        const down = gesture.numberActiveTouches === 1 && gesture.dy > Math.abs(gesture.dx)
        drag.setValue(down ? Math.max(0, gesture.dy) : 0)
      },
      onPanResponderRelease: (_event, gesture) => {
        const down = gesture.dy > Math.abs(gesture.dx)
        if (down && (gesture.dy > height * CLOSE_SHARE || gesture.vy > CLOSE_SPEED)) close.current()
        else settle()
      },
      onPanResponderTerminate: settle,
      // The scroll view's own gestures (the zoom) go first.
      onPanResponderTerminationRequest: () => true,
    })
  }, [theme, height, drag])

  const onZoom = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const now = (event.nativeEvent.zoomScale ?? 1) > 1.01
    if (now !== zoomed.current) {
      zoomed.current = now
      setIsZoomed(now)
    }
  }

  const fade = drag.interpolate({ inputRange: [0, height * DRAGGED.share], outputRange: [1, DRAGGED.backdrop], extrapolate: 'clamp' })

  return (
    <Modal
      visible={!!uri}
      transparent
      animationType='fade'
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      {!!uri && <StatusBar barStyle='light-content' />}
      <Animated.View testID='chat-image-viewer' style={[looks.backdrop, { opacity: fade }]} />
      <Animated.View style={[looks.fill, { transform: [{ translateY: drag }] }]} testID='chat-image-viewer-drag' {...pan.panHandlers}>
        <ScrollView
          style={looks.fill}
          contentContainerStyle={looks.zoom}
          // iOS only: Android's scroll view has no zoom.
          maximumZoomScale={MAX_ZOOM}
          minimumZoomScale={1}
          bouncesZoom
          centerContent
          scrollEnabled={isZoomed}
          bounces={isZoomed}
          onScroll={onZoom}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          {!!uri && <Image testID='chat-image-viewer-image' source={{ uri }} style={looks.image} resizeMode='contain' />}
        </ScrollView>
      </Animated.View>
      {/* The theme's floating button (inverse): its glyph is read over the backdrop. */}
      <OFab iconName='close' onPress={onClose} accessibilityLabel={closeLabel} style={looks.close} />
    </Modal>
  )
}
