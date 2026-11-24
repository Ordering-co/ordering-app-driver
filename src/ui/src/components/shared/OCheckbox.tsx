import React from 'react'
import { Pressable } from 'react-native'
import { useTheme } from 'styled-components/native'
import { themeControlHeight, themeOpacity } from '@/theme/helpers'
import ChoiceMark from './ChoiceMark'

interface Props {
  value: boolean
  onValueChange: (value: boolean) => void
  disabled?: boolean
  testID?: string
  accessibilityLabel?: string
}

/**
 * The app's checkbox: `components.checkbox` of the theme (its size, checked
 * color and unchecked border color), drawn like the other checkboxes of the
 * app, with the theme's pressed opacity and a touch target of the `md` control
 * height.
 */
const OCheckbox = ({ value, onValueChange, disabled, testID, accessibilityLabel }: Props) => {
  const theme: any = useTheme()
  const checkbox = theme.native.components.checkbox.base
  const target = themeControlHeight(theme, 'md')
  const slop = Math.max(0, (target - checkbox.size) / 2)
  return (
    <Pressable
      testID={testID}
      accessibilityRole='checkbox'
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={slop}
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => pressed && { opacity: themeOpacity(theme, 'pressed') }}
    >
      <ChoiceMark kind='check' checked={value} />
    </Pressable>
  )
}

export default OCheckbox
