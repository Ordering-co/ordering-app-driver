import React, { useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { StableText } from './StableText'
import { nativeBoxStyle, nativeTextStyle, themeControlHeight, themeGutter, themeOpacity } from '@/theme/helpers'

/** The share (%) of a tab its underline spans, by `tabs.variants.underline.indicator_length`. */
const INDICATOR_LENGTHS: Record<string, number> = { full: 100, medium: 50, small: 25 }

/**
 * The app's tabs: `components.tabs` in a variant, `pill` (a track with a filled
 * selected tab), `underline` (a baseline with an indicator under the selected
 * tab) or `plain`; the theme's own (`base.variant`) unless the screen names
 * one. One row that scrolls sideways; `fill` shares the row's width among the
 * tabs instead. Selecting a tab never moves the others: the bold label keeps
 * its room and the underline's room is always there.
 *
 *   <Tabs tabs={[{ key: 'pending', text: t('PENDING', 'Pending') }]} selected={tab} onChange={setTab} />
 */
export interface TabItem { key: string | number, text: string, testID?: string }

interface Props {
  tabs: TabItem[]
  selected: string | number
  onChange: (key: any, tab: TabItem) => void
  variant?: 'pill' | 'underline' | 'plain'
  size?: 'sm' | 'md' | 'lg'
  /** The tabs share the row's width (a few tabs that fit) instead of scrolling. */
  fill?: boolean
  /**
   * A row that scrolls sideways and runs to the screen's right edge (its screen puts no gutter after it): the page
   * gutter ends its content instead, so the last tab can be scrolled clear of the edge, and a tab cut by the edge says
   * there is more. No effect with `fill`.
   */
  endGutter?: boolean
  /**
   * A row that scrolls only when its tabs do not fit: it is measured, and tabs that fit are spread over the full
   * width (each keeps its own width and takes its part of what is left, as the tabs of `fill` fill the row);
   * otherwise it scrolls as before. With `endGutter` the row also runs out to the screen's edge (it gives the gutter back to itself) while
   * it scrolls. No effect with `fill`.
   */
  fitFill?: boolean
  /**
   * A label is one line and never breaks (not into two lines, not inside a word): the tab takes the width its label asks for, in its
   * heaviest weight (the selected one's room is always kept, so selecting never moves the tabs). With `fitFill` the tabs that fit keep
   * their own width and share what is left of the row equally (each tab grows by the same amount, so the room around the labels is the
   * same on every tab and no long label takes more of the spare than a short one); tabs that do not fit scroll.
   */
  noWrap?: boolean
  testID?: string
}

const tabsStyles = (theme: any, variantName: string | undefined, sizeName: string, fill: boolean, grow = false) => {
  const tabs = theme.native.components.tabs
  const variant = variantName ?? tabs.base.variant
  const look = tabs.variants[variant] ?? tabs.variants.pill
  const size = tabs.sizes[sizeName] ?? tabs.sizes.md
  const underline = variant === 'underline'
  const indicatorShare = underline ? INDICATOR_LENGTHS[look.indicator_length] ?? INDICATOR_LENGTHS.full : INDICATOR_LENGTHS.full
  // `joined` (pill, no gap): one block, square inside, the tab radius only at its ends.
  const joined = variant === 'pill' && look.joined === true && (look.gap ?? 0) === 0
  // The size's height is the whole bar: a tab inside a track (`inset`) is that much lower, so the track
  // is as high as the size says.
  const tabHeight = Math.max(0, size.height - 2 * (look.inset ?? 0))
  // A tab lower than the smallest touch target grows its touch area, not its look.
  const slop = Math.max(0, (themeControlHeight(theme, 'md') - tabHeight) / 2)
  return {
    joined,
    partialIndicator: indicatorShare < INDICATOR_LENGTHS.full,
    active: look.active,
    inactive: look.inactive,
    slop: { top: slop, bottom: slop },
    sheet: StyleSheet.create({
      track: {
        flexDirection: 'row',
        gap: look.gap ?? 0,
        borderRadius: look.radius ?? 0,
        padding: look.inset ?? 0,
        ...((fill || grow) && { width: '100%' as const }),
        ...nativeBoxStyle({ background: look.background, border: look.border }),
        ...(underline ? { borderBottomWidth: look.baseline.borderWidth, borderBottomColor: look.baseline.borderColor } : {}),
      },
      tab: {
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: tabHeight,
        paddingHorizontal: size.padding_x,
        borderRadius: look.tab_radius ?? 0,
        // `fill`: equal shares; `grow` (tabs that fit their row): each keeps its own width and takes its part of what is left.
        ...(fill && { flex: 1 }),
        ...(grow && { flexGrow: 1 }),
        ...(look.tab_border ?? {}),
        // The full underline's room is kept on every tab: selecting only colors it.
        ...(underline && indicatorShare >= INDICATOR_LENGTHS.full ? { borderBottomWidth: look.indicator_thickness, borderBottomColor: 'transparent' } : {}),
      },
      selected: underline
        ? (indicatorShare < INDICATOR_LENGTHS.full ? {} : { borderBottomColor: look.indicator })
        : { backgroundColor: look.active_background },
      indicator: {
        position: 'absolute',
        bottom: 0,
        left: `${(INDICATOR_LENGTHS.full - indicatorShare) / 2}%`,
        width: `${indicatorShare}%`,
        height: look.indicator_thickness ?? 0,
        backgroundColor: look.indicator,
      },
      notFirst: { borderTopStartRadius: 0, borderBottomStartRadius: 0 },
      notLast: { borderTopEndRadius: 0, borderBottomEndRadius: 0 },
      text: { ...nativeTextStyle(tabs.base.text), textAlign: 'center' },
      pressed: { opacity: themeOpacity(theme, 'pressed') },
      end: { paddingEnd: themeGutter(theme) },
    }),
  }
}

// Layout only (no theme values): safe at module level.
const layout = StyleSheet.create({ scroll: { alignItems: 'center' }, grow: { flexGrow: 0 } })

export const Tabs = ({ tabs, selected, onChange, variant, size = 'md', fill = false, endGutter = false, fitFill = false, noWrap = false, testID }: Props) => {
  const theme: any = useTheme()
  // Measured once per set of tabs and per size of the text and the window: the room the row has (less the gutter it gives
  // back) and the width its tabs take together (the track hugs them while the row scrolls). A window that gets narrower (a
  // rotation, a split screen) or a larger font makes tabs that fitted not fit, so those measure again.
  const { width: windowWidth, fontScale } = useWindowDimensions()
  const signature = `${tabs.map((tab) => `${tab.key}:${tab.text}`).join('|')}@${windowWidth}x${fontScale}`
  const [measure, setMeasure] = useState<{ signature: string, room: number, track: number }>({ signature, room: 0, track: 0 })
  const current = measure.signature === signature ? measure : { signature, room: 0, track: 0 }
  const gutter = themeGutter(theme)
  // The width the shared row was first laid out at: a later one means the room changed under tabs that were fitted.
  const sharedAt = useRef<number | null>(null)
  const fits = fitFill && !fill && current.room > 0 && current.track > 0 && current.track <= current.room
  const shared = fill || fits
  const look = useMemo(() => tabsStyles(theme, variant, size, fill, fits), [theme, variant, size, fill, fits])
  const record = (patch: Partial<{ room: number, track: number }>) => setMeasure((previous) => ({ ...(previous.signature === signature ? previous : current), ...patch }))
  // The shared row is as wide as its room: another width is another room, so the tabs are measured again (scrolling
  // until they are, then shared again if they still fit).
  const watchRoom = (width: number) => {
    if (sharedAt.current === null) { sharedAt.current = width; return }
    if (Math.abs(width - sharedAt.current) <= 1) return
    sharedAt.current = null
    setMeasure({ signature, room: 0, track: 0 })
  }
  if (!fits) sharedAt.current = null

  const row = (
    <View
      style={look.sheet.track}
      onLayout={fitFill && !shared ? (event) => record({ track: event.nativeEvent.layout.width }) : fits ? (event) => watchRoom(event.nativeEvent.layout.width) : undefined}
      testID={shared ? testID : testID && `${testID}-track`}
    >
      {tabs.map((tab, index) => {
        const isSelected = tab.key === selected
        return (
          <Pressable
            key={String(tab.key)}
            testID={tab.testID}
            accessibilityRole='tab'
            accessibilityState={{ selected: isSelected }}
            hitSlop={look.slop}
            style={({ pressed }) => [
              look.sheet.tab,
              isSelected && look.sheet.selected,
              look.joined && index > 0 && look.sheet.notFirst,
              look.joined && index < tabs.length - 1 && look.sheet.notLast,
              pressed && look.sheet.pressed,
            ]}
            onPress={() => onChange(tab.key, tab)}
          >
            {/* Semibold when selected, in the room of its semibold copy: selecting never moves the tabs. */}
            <StableText
              style={look.sheet.text}
              weight={isSelected ? 600 : undefined}
              reserveWeight={600}
              numberOfLines={noWrap ? 1 : undefined}
              color={isSelected ? look.active : look.inactive}
            >
              {tab.text}
            </StableText>
            {isSelected && look.partialIndicator && <View style={look.sheet.indicator} />}
          </Pressable>
        )
      })}
    </View>
  )

  if (shared) return row
  return (
    <ScrollView
      // One scroll per measurement: React Native sends a view's layout only when it changes (and when it mounts), so a measure that starts
      // over (a font size the window reports changed, with the same layout under it: the system caps its text at some size) would wait for
      // an event that never comes and the tabs would stay unshared until a relaunch. A new signature mounts a new row, which reports.
      key={signature}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[layout.grow, fitFill && endGutter && { marginEnd: -gutter }]}
      contentContainerStyle={[layout.scroll, endGutter && look.sheet.end]}
      onLayout={fitFill ? (event) => record({ room: event.nativeEvent.layout.width - (endGutter ? gutter : 0) }) : undefined}
      testID={testID}
    >
      {row}
    </ScrollView>
  )
}

export default Tabs
