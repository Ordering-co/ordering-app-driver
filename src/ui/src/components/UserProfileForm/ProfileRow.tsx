import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { Icon, OListRow, OText } from '../shared'
import { CardRow } from './RowsCard'
import { themePart } from '@/theme/helpers'

interface Props {
  title: string
  /** What the row says now (today's hours, the language, the driver's e-mail): muted, before the chevron. */
  value?: string
  icon?: string
  /** The row opens something: a chevron ends it. */
  onPress?: () => void
  /** The title and the glyph in the danger color. */
  danger?: boolean
  /**
   * An information row (Profile mockup): the field's name is muted and its value is the row's own text, in the
   * body size and color; an account row names the destination in the text color and its value, small, muted.
   */
  information?: boolean
  /** No chevron on a row that acts (log out) instead of opening a screen. */
  chevron?: boolean
  disabled?: boolean
  testID?: string
}

/**
 * A row of the account pages' lists (`RowsCard`): the app's list row (`components.list_row`) with the
 * value it shows at its end, in the muted metadata look (an `information` row inverts it: the name muted, the value in the text color), ahead of the chevron of a row that opens
 * something. The list draws the line between rows, so a row never draws its own.
 */
export const ProfileRow = ({ title, value, icon, onPress, danger, information, chevron = true, disabled, testID }: Props) => {
  const theme: any = useTheme()
  const row = themePart(theme, 'list_row', 'base')
  const styles = useMemo(() => StyleSheet.create({
    // The value gives way to the title: it takes at most 60% of the row and the title keeps the rest. An account row's value (today's
    // hours, the language) is something the driver reads, so it wraps to a second line at the largest text size rather than ending in
    // an ellipsis; an information row's value (an e-mail, a name) may be one long word with no place to break, so it is cut.
    end: { flexDirection: 'row', alignItems: 'center', gap: row.gap, flexShrink: 1, maxWidth: '60%' },
    value: { flexShrink: 1, textAlign: 'right' },
  }), [row.gap])
  return (
    <CardRow>
      <OListRow
        last
        testID={testID}
        title={title}
        icon={icon}
        danger={danger}
        titleMuted={information}
        chevron={chevron}
        disabled={disabled}
        onPress={onPress}
        trailing={value ? (
          <View style={styles.end}>
            {information
              ? <OText preset='body' style={styles.value} numberOfLines={1}>{value}</OText>
              : <OText preset='body_sm' color='text_muted' style={styles.value}>{value}</OText>}
            {!!onPress && chevron && <Icon name='chevron-forward' size={row.trailing_icon_size} color='text_muted' />}
          </View>
        ) : undefined}
      />
    </CardRow>
  )
}
