import React, { useMemo } from 'react'
import { Pressable, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { focusStyles } from './styles'
import { Icon, OCard, ODivider } from '../../shared'

interface Props {
  open: boolean
  onToggle: () => void
  /** What the row is called for the screen reader (its header's first words). */
  label: string
  /** Before the header: an icon. */
  leading?: React.ReactNode
  /** The header's texts. */
  header: React.ReactNode
  /** What the row opens. */
  body?: React.ReactNode
  /** What the row opens closes with its own padding (the products' lines, each `sm` over and under): the body adds none. */
  bodyFlush?: boolean
  /** Drawn in a card of its own; a row of a card that holds several (the finished order's two stops) is not. */
  boxed?: boolean
  /** The look of the card (the highlighted block of the cash to collect). */
  look?: Record<string, any>
  chevronColor?: string
  /** A header taller than the row's own (the cash to collect: `order_details.base.collect_min_height`). */
  minHeight?: number
  /** The header has `md` over and under its texts instead of `sm`: the stacked cash to collect, which the board draws with its 15 all around. */
  roomy?: boolean
  testID?: string
}

/**
 * A row of the `focus` layout that folds: its header is a touch target (at least the `lg` control height) with the
 * app's accordion glyph at the end, and what it opens goes under a line. The stops, the payment, the
 * products and the more details are all this one row.
 */
export const FoldedRow = ({ open, onToggle, label, leading, header, body, bodyFlush = false, boxed = true, look, chevronColor = 'text_muted', minHeight, roomy = false, testID }: Props) => {
  const theme: any = useTheme()
  const styles = useMemo(() => focusStyles(theme), [theme])

  const content = (
    <>
      <Pressable
        testID={testID}
        accessibilityRole='button'
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={({ pressed }) => [styles.foldHead, roomy && styles.foldHeadRoomy, !!minHeight && { minHeight }, pressed && styles.pressed]}
      >
        {leading}
        <View style={styles.grow}>{header}</View>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} color={chevronColor} />
      </Pressable>
      {open && !!body && (
        <>
          <ODivider />
          <View style={bodyFlush ? undefined : styles.foldBody} testID={testID && `${testID}-body`}>{body}</View>
        </>
      )}
    </>
  )

  return boxed ? <OCard look={look} style={styles.foldCard} testID={testID && `${testID}-card`}>{content}</OCard> : content
}
