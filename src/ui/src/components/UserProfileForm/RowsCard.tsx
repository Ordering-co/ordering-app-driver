import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { ODivider, OCard } from '../shared'
import { themeColor, themePart, themeSpace } from '@/theme/helpers'

// The card's padding is the rows' (each one carries its own sides), so they reach its edges.
const LOOK = { padding: 0 }

/**
 * The account pages' list: a card (`components.card`: its box, border and shadow) of rows with the
 * list's line between two rows, as the profile's information and account, the schedule's days and the
 * logout row are drawn. The rows are `CardRow`s, clipped inside the card's corners (a highlighted row
 * is painted to them, so the clip is on an inner box and the card keeps its shadow).
 * `trailing` is a last row that may not exist (the language, which arrives late and may be alone): it
 * draws its own line, so a row that is not there leaves none.
 */
export const RowsCard = ({ children, trailing, testID }: { children?: React.ReactNode, trailing?: React.ReactNode, testID?: string }) => {
  const theme: any = useTheme()
  const styles = useMemo(() => StyleSheet.create({
    clip: { overflow: 'hidden', borderRadius: themePart(theme, 'card', 'base.radius') },
  }), [theme])
  const rows = React.Children.toArray(children)
  return (
    <OCard look={LOOK} testID={testID}>
      <View style={styles.clip}>
        {rows.map((row, index) => (
          <React.Fragment key={(row as React.ReactElement).key ?? index}>
            {index > 0 && <ODivider />}
            {row}
          </React.Fragment>
        ))}
        {trailing}
      </View>
    </OCard>
  )
}

/** A row of a `RowsCard`: the card's sides (`md`) around its content, and a tint behind it when `highlighted`. */
export const CardRow = ({ children, highlighted = false, testID }: { children?: React.ReactNode, highlighted?: boolean, testID?: string }) => {
  const theme: any = useTheme()
  const styles = useMemo(() => StyleSheet.create({
    row: { paddingHorizontal: themeSpace(theme, 'md') },
    highlighted: { backgroundColor: themeColor(theme, 'primary_subtle') },
  }), [theme])
  return <View style={[styles.row, highlighted && styles.highlighted]} testID={testID}>{children}</View>
}
