import React, { useMemo } from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import { useTheme } from 'styled-components/native'

/**
 * A line between things: `components.divider`. `item` between the rows of a
 * list, `section` between the sections of a page (with its space above and
 * below), `band` a thick band out to the page sides, `vertical` the line
 * between two things side by side (its spacing on both sides).
 */
interface Props {
  variant?: 'item' | 'section' | 'band' | 'vertical'
  style?: ViewStyle
}

export const ODivider = ({ variant = 'item', style }: Props) => {
  const theme: any = useTheme()
  const styles = useMemo(() => {
    const look = theme.native.components.divider.variants[variant]
    return StyleSheet.create({
      line: variant === 'vertical'
        ? {
          alignSelf: 'stretch',
          width: look.line?.borderWidth ?? 0,
          backgroundColor: look.line?.borderColor,
          marginHorizontal: look.spacing,
          marginVertical: look.indent,
        }
        : {
          width: '100%',
          height: look.line?.borderWidth ?? 0,
          backgroundColor: look.line?.borderColor,
          marginVertical: look.spacing,
        },
    })
  }, [theme, variant])
  return <View style={[styles.line, style]} />
}

export default ODivider
