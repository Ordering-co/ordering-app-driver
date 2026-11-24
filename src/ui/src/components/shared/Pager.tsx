import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  Dimensions,
  FlatList,
  LayoutChangeEvent,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleProp,
  ViewStyle
} from 'react-native'
import { useTheme } from 'styled-components/native'
import { themeColor, themeSpace } from '@/theme/helpers'

import { Dot, DotsRow, Page, PagerContainer } from './pagerStyles'

/**
 * A horizontal pager (a FlatList with `pagingEnabled`) for the onboarding
 * tutorial and the page banners, in place of react-native-app-intro-slider
 * and react-native-swiper-flatlist: one page per item at the pager's width,
 * the index reported when a swipe settles, `goTo`/`next` for buttons, and an
 * optional autoplay that loops and waits while the user drags.
 */
export type PagerHandle = {
  goTo: (index: number, animated?: boolean) => void
  next: () => void
}

export type PagerOverlay = {
  index: number
  count: number
  goTo: (index: number) => void
  next: () => void
}

type PagerProps<T> = {
  data: T[]
  renderItem: ListRenderItem<T>
  keyExtractor?: (item: T, index: number) => string
  /** The page width; the pager's own measured width when left out. */
  pageWidth?: number
  initialIndex?: number
  onIndexChange?: (index: number, previous: number) => void
  /** Advances every so many milliseconds, back to the first after the last. */
  autoplayMs?: number
  /** Drawn over the list (dots, buttons) with the current index. */
  renderOverlay?: (state: PagerOverlay) => React.ReactNode
  style?: StyleProp<ViewStyle>
  listStyle?: StyleProp<ViewStyle>
  testID?: string
}

/** The page a horizontal offset settles on, inside the list. */
export const pageAt = (offsetX: number, width: number, count: number) => {
  if (!width || count <= 0) return 0
  return Math.min(count - 1, Math.max(0, Math.round(offsetX / width)))
}

const PagerInner = <T,>(props: PagerProps<T>, ref: React.Ref<PagerHandle>) => {
  const {
    data,
    renderItem,
    keyExtractor,
    pageWidth,
    initialIndex = 0,
    onIndexChange,
    autoplayMs,
    renderOverlay,
    style,
    listStyle,
    testID
  } = props
  const listRef = useRef<FlatList<T>>(null)
  const [measuredWidth, setMeasuredWidth] = useState(0)
  const [index, setIndex] = useState(initialIndex)
  const indexRef = useRef(initialIndex)
  const [dragging, setDragging] = useState(false)
  const width = pageWidth ?? (measuredWidth || Dimensions.get('window').width)
  const count = data.length

  const settle = useCallback((next: number) => {
    const previous = indexRef.current
    if (next === previous) return
    indexRef.current = next
    setIndex(next)
    onIndexChange?.(next, previous)
  }, [onIndexChange])

  const goTo = useCallback((target: number, animated = true) => {
    if (count <= 0) return
    const next = Math.min(count - 1, Math.max(0, target))
    listRef.current?.scrollToOffset({ offset: next * width, animated })
    settle(next)
  }, [count, width, settle])

  const next = useCallback(() => {
    goTo(indexRef.current + 1 >= count ? 0 : indexRef.current + 1)
  }, [goTo, count])

  useImperativeHandle(ref, () => ({ goTo, next }), [goTo, next])

  // The list keeps its page when the width changes (rotation, the first layout).
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: indexRef.current * width, animated: false })
  }, [width])

  // A list that shrinks (fewer banners) never stays past its last page.
  useEffect(() => {
    if (count > 0 && indexRef.current > count - 1) goTo(count - 1, false)
  }, [count, goTo])

  useEffect(() => {
    if (!autoplayMs || count < 2 || dragging) return
    const timer = setInterval(next, autoplayMs)
    return () => clearInterval(timer)
  }, [autoplayMs, count, dragging, next])

  const onLayout = (event: LayoutChangeEvent) => {
    const measured = Math.round(event.nativeEvent.layout.width)
    if (measured > 0 && measured !== measuredWidth) setMeasuredWidth(measured)
  }

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setDragging(false)
    settle(pageAt(event.nativeEvent.contentOffset.x, width, count))
  }

  const getItemLayout = useCallback((_: unknown, itemIndex: number) => ({
    length: width,
    offset: width * itemIndex,
    index: itemIndex
  }), [width])

  const renderPage: ListRenderItem<T> = (info) => <Page $width={width}>{renderItem(info)}</Page>

  return (
    <PagerContainer style={style} onLayout={onLayout} testID={testID}>
      <FlatList
        ref={listRef}
        data={data}
        renderItem={renderPage}
        keyExtractor={keyExtractor}
        extraData={width}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        getItemLayout={getItemLayout}
        initialScrollIndex={initialIndex > 0 && initialIndex < count ? initialIndex : undefined}
        initialNumToRender={count}
        onScrollBeginDrag={() => setDragging(true)}
        onMomentumScrollEnd={onMomentumScrollEnd}
        style={listStyle}
      />
      {renderOverlay?.({ index, count, goTo, next })}
    </PagerContainer>
  )
}

export const Pager = forwardRef(PagerInner) as <T>(
  props: PagerProps<T> & { ref?: React.Ref<PagerHandle> }
) => React.ReactElement

type PagerDotsProps = {
  count: number
  index: number
  onPress?: (index: number) => void
  /** Dot diameter; a space step of the theme by default. */
  size?: number
  color?: string
  activeColor?: string
  style?: StyleProp<ViewStyle>
  dotStyle?: StyleProp<ViewStyle>
  activeDotStyle?: StyleProp<ViewStyle>
}

/** The pager's dots, in the theme's colors unless the screen gives its own. */
export const PagerDots = ({ count, index, onPress, size, color, activeColor, style, dotStyle, activeDotStyle }: PagerDotsProps) => {
  const theme: any = useTheme()
  if (count < 2) return null
  const diameter = size ?? themeSpace(theme, 'sm')
  return (
    <DotsRow style={style}>
      {Array.from({ length: count }).map((_, i) => {
        const active = i === index
        return (
          <Dot
            key={i}
            testID={active ? 'pager-dot-active' : 'pager-dot'}
            $size={diameter}
            $color={active ? (activeColor ?? themeColor(theme, 'primary')) : (color ?? themeColor(theme, 'border'))}
            style={active ? activeDotStyle : dotStyle}
            disabled={!onPress}
            onPress={() => onPress?.(i)}
          />
        )
      })}
    </DotsRow>
  )
}
