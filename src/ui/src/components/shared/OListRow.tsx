import React, { useMemo } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { nativeTextStyle, themeColor, themeControlHeight, themeOpacity } from '@/theme/helpers'
import OText from './OText'
import Icon, { type IconSet } from './Icon'

/**
 * A row of a list or a menu: `components.list_row` (a leading icon, a title,
 * a subtitle and what the row ends with: a chevron when it opens something).
 * A row that opens something is the touch target, at least 50 pt high (the `lg` control height; `tall`, 76); one
 * that only says something (the profile's information) is 44.
 */
interface Props {
  title: string
  subtitle?: string
  icon?: string
  iconSet?: IconSet
  /** What the row starts with, in place of a glyph (an app's icon, a picture). */
  leading?: React.ReactNode
  /** What the row ends with, in place of the chevron of a row that opens something. */
  trailing?: React.ReactNode
  /** The title in the danger color (log out, delete). */
  danger?: boolean
  /** The title in the muted color: a row that names a field whose value is the row's end (the profile's information). */
  titleMuted?: boolean
  /** A row that opens something ends with a chevron; `false` leaves it out (an action, not a destination). */
  chevron?: boolean
  /** What follows the title on its line, before the row's end (the schedule's "Today" badge). */
  titleEnd?: React.ReactNode
  /** A taller row (`list_row.base.tall_min_height`): the one the list marks (the schedule's today). */
  tall?: boolean
  /** How many lines the title may take (one by default). */
  titleLines?: number
  /** No line under the row (the last one of a list). */
  last?: boolean
  /**
   * A fill for this row in place of the list's (`list_row.base.background`): a row the list marks
   * (the schedule's today). The row paints its own background over whatever is behind it, so a
   * tint put on a wrapper would show only at the sides: it has to be this one.
   */
  background?: string
  onPress?: () => void
  disabled?: boolean
  testID?: string
}

export const OListRow = ({ title, subtitle, icon, iconSet, leading, trailing, danger, titleMuted, chevron = true, titleEnd, tall, titleLines = 1, last, background, onPress, disabled, testID }: Props) => {
  const theme: any = useTheme()
  const row = theme.native.components.list_row.base
  const styles = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      // A row that opens something is 50 high at least; one that only says something (the profile's information) 44, as the boards draw them.
      minHeight: tall ? row.tall_min_height : themeControlHeight(theme, onPress ? 'lg' : 'md'),
      paddingVertical: row.padding_y,
      gap: row.gap,
      backgroundColor: background ?? row.background,
      ...(!last && row.divider && { borderBottomWidth: row.divider.borderWidth, borderBottomColor: row.divider.borderColor }),
    },
    texts: { flex: 1 },
    titleLine: { flexDirection: 'row', alignItems: 'center', gap: row.gap },
    titleText: { flexShrink: 1 },
    title: { ...nativeTextStyle(row.title), color: danger ? themeColor(theme, 'danger_text') : titleMuted ? themeColor(theme, 'text_muted') : row.title_color },
    subtitle: { ...nativeTextStyle(row.subtitle), color: row.subtitle_color },
    pressed: { opacity: themeOpacity(theme, 'pressed') },
    disabled: { opacity: themeOpacity(theme, 'disabled') },
  }), [theme, row, last, danger, titleMuted, background, tall, onPress])
  const content = (
    <>
      {leading}
      {!leading && !!icon && <Icon set={iconSet} name={icon} size={row.icon_size} color={danger ? 'danger_text' : row.icon_color} />}
      <View style={styles.texts}>
        {titleEnd
          ? (
            <View style={styles.titleLine}>
              <OText style={[styles.title, styles.titleText]} numberOfLines={titleLines}>{title}</OText>
              {titleEnd}
            </View>
          )
          : <OText style={styles.title} numberOfLines={titleLines}>{title}</OText>}
        {!!subtitle && <OText style={styles.subtitle} numberOfLines={2}>{subtitle}</OText>}
      </View>
      {trailing ?? (onPress && chevron ? <Icon name='chevron-forward' size={row.trailing_icon_size} color='text_muted' /> : null)}
    </>
  )
  if (!onPress) return <View style={styles.row} testID={testID}>{content}</View>
  return (
    <Pressable
      testID={testID}
      accessibilityRole='button'
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}
    >
      {content}
    </Pressable>
  )
}

export default OListRow
