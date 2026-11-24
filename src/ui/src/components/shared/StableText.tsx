import React from 'react'
import { StyleSheet, TextStyle, View, ViewStyle } from 'react-native'
import OText from './OText'

interface Props {
  children: React.ReactNode
  /** The text look (a component's `text`), the same in both states. */
  style?: TextStyle | Array<TextStyle | false | null | undefined>
  /** The weight shown now (the selected one, or none for the look's own). */
  weight?: number | string
  /** The heaviest weight the text takes (its selected state): its room is kept. */
  reserveWeight: number | string
  color?: string
  numberOfLines?: number
  boxStyle?: ViewStyle
}

// Layout only (no theme values): safe at module level.
const layout = StyleSheet.create({
  hidden: { opacity: 0 },
  shown: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center' }
})

/**
 * A label whose weight changes with its state (a selected tab or category is
 * bold) without moving anything: a hidden copy at the heaviest weight keeps
 * its width and height, and the label is drawn over it. Selecting changes the
 * look, never the layout.
 */
export const StableText = ({ children, style, weight, reserveWeight, color, numberOfLines, boxStyle }: Props) => (
  <View style={boxStyle}>
    <OText
      style={[style, layout.hidden] as any}
      weight={reserveWeight}
      color={color}
      numberOfLines={numberOfLines}
      accessibilityElementsHidden
      importantForAccessibility='no-hide-descendants'
    >
      {children}
    </OText>
    <View style={layout.shown} pointerEvents='none'>
      <OText style={style} weight={weight} color={color} numberOfLines={numberOfLines}>
        {children}
      </OText>
    </View>
  </View>
)

export default StableText
