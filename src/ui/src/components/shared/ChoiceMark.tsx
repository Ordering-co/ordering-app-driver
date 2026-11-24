import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { themeBorderWidth, themeScoped, themeSpace } from '@/theme/helpers'
import Icon from './Icon'

interface Props {
  /** `radio` for a single choice, `check` for a multiple one. */
  kind: 'radio' | 'check'
  checked: boolean
  /** The group whose scope restyles the choice (the product's options); none: the global look. */
  group?: string
  style?: any
  testID?: string
}

/**
 * The indicator of a choice (a product's options, ingredients): the theme's radio
 * (`components.radio`) for a single choice and its checkbox (`components.checkbox`)
 * for a multiple one, `checked` in the brand color and the border color when it is not.
 * The checkbox is an icon of the app at the control's size. The radio is drawn, a ring of
 * exactly the radio's size with its dot inside: the glyph's circle fills only some 0.82 of
 * its box, so a 20 radio showed a 16.5 ring where the boards draw 20. The row around it
 * carries the disabled look and the touch area (`ChoiceRow`).
 */
const ChoiceMark = ({ kind, checked, group, style, testID }: Props) => {
  const theme: any = useTheme()
  const radio = group ? themeScoped(theme, group, 'radio') : theme.native.components.radio
  const checkbox = group ? themeScoped(theme, group, 'checkbox') : theme.native.components.checkbox
  const ink = checked ? radio.base.checked : radio.base.unchecked
  const ring = useMemo(() => StyleSheet.create({
    // The ring is the radio's size as drawn (the border is inside it); a radius over half of it makes a circle.
    ring: {
      width: radio.base.size,
      height: radio.base.size,
      borderRadius: radio.base.size,
      borderWidth: themeBorderWidth(theme, 'thick'),
      padding: themeSpace(theme, 'xxs')
    },
    dot: { flex: 1, borderRadius: radio.base.size }
  }), [theme, radio])
  if (kind === 'radio') {
    return (
      <View testID={testID} style={[ring.ring, { borderColor: ink }, style]}>
        {checked && <View testID={testID && `${testID}-dot`} style={[ring.dot, { backgroundColor: ink }]} />}
      </View>
    )
  }
  return (
    <Icon
      testID={testID}
      style={style}
      set='mci'
      name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
      size={checkbox.base.size}
      color={checked ? checkbox.base.checked : checkbox.base.border.borderColor}
    />
  )
}

export default ChoiceMark
