import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { useLanguage } from '@components'
import { nativeTextStyle, themeSpace } from '@/theme/helpers'
import OButton from './OButton'
import OText from './OText'
import Icon from './Icon'

/**
 * A number with a button to lower it and one to raise it: `components.stepper`
 * (the value's text, the buttons' appearance and its sizes).
 */
interface Props {
  value: number
  min?: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  onChange: (value: number) => void
  /** What is shown in place of the number (a formatted value). */
  label?: string
  testID?: string
}

const BUTTON_SIZES = { sm: 'sm', md: 'md', lg: 'lg' } as const

export const OStepper = ({ value, min = 0, max = Number.MAX_SAFE_INTEGER, size = 'md', disabled, onChange, label, testID }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const stepper = theme.native.components.stepper
  const styles = useMemo(() => StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    // The number: in a box as tall as the buttons and `value_min_width` wide at least, centered.
    valueBox: { minWidth: stepper.base.value_min_width, minHeight: stepper.sizes[size].height, alignItems: 'center', justifyContent: 'center' },
    value: { ...nativeTextStyle(stepper.base.value), color: stepper.base.value_color, textAlign: 'center' },
  }), [theme, stepper, size])
  return (
    <View style={styles.row} testID={testID}>
      <OButton
        iconOnly
        color='neutral'
        appearance={stepper.base.button_appearance}
        size={BUTTON_SIZES[size]}
        icon={<Icon name='remove' size='md' />}
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        accessibilityLabel={t('DECREASE', 'Decrease')}
      />
      <View style={styles.valueBox}>
        <OText style={styles.value}>{label ?? value}</OText>
      </View>
      <OButton
        iconOnly
        color='neutral'
        appearance={stepper.base.button_appearance}
        size={BUTTON_SIZES[size]}
        icon={<Icon name='add' size='md' />}
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        accessibilityLabel={t('INCREASE', 'Increase')}
      />
    </View>
  )
}

export default OStepper
