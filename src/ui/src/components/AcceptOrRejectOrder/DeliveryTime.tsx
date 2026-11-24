import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { FilterChip, Icon, MinutesValue, OButton, OText } from '../shared'
import type { MinutesFlush, MinutesValueHandle } from '../shared'
import { deliveryTimeStyles } from './styles'
import { DELIVERY_TIME, stepMinutes } from './deliveryTimeRules'

export type DeliveryTimeHandle = Pick<MinutesValueHandle, 'flush' | 'isEditing'>

interface Props {
  /** The minutes now (what the sheet sends). */
  minutes: number
  onChange: (minutes: number) => void
  /** The request is going: the presets, the stepper and the figure answer no tap. */
  disabled?: boolean
  testID?: string
}

/**
 * The delivery time of the accept sheet: its label, the five presets as chips (the one equal to the value is selected, and it
 * follows what is being typed), and the stepper's line: minus, the figure (a button that becomes a field for the minutes, see
 * `MinutesValue`) and plus, five minutes at a time, on the soft fill the dial had. The sheet asks `flush()` before its own
 * buttons act (the position's stepper, Accept): it settles a number being typed and says whether it had to be corrected; `isEditing()` tells the sheet
 * whether a tap on its blank parts or on the dimmed page has a typing to end.
 */
export const DeliveryTime = forwardRef<DeliveryTimeHandle, Props>(({ minutes, onChange, disabled = false, testID = 'delivery-time-block' }, ref) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const styles = useMemo(() => deliveryTimeStyles(theme), [theme])
  const field = useRef<MinutesValueHandle>(null)
  // The number being typed, while it is inside the limits: the presets say it before the field settles.
  const [typing, setTyping] = useState<number | null>(null)
  const shown = typing ?? minutes

  const flush = (): MinutesFlush => field.current?.flush() ?? { value: null, corrected: false }
  useImperativeHandle(ref, () => ({ flush, isEditing: () => field.current?.isEditing() ?? false }))

  const unit = t('TIME_MIN', 'min')
  // The digits of the delivery time (`order_request.base.time_color`), at rest and while typed.
  const figureColor = theme.native.components.order_request.base.time_color
  const step = String(DELIVERY_TIME.step)
  // A number being typed ends where the tap lands: the buttons start from what the field settles on.
  const settled = () => flush().value ?? minutes

  return (
    <View style={styles.block} testID={testID}>
      <OText preset='label'>{t('DELIVERY_TIME', 'Delivery time')}</OText>

      <View
        style={styles.presets}
        accessibilityRole='radiogroup'
        accessibilityLabel={t('DELIVERY_TIME_PRESETS', 'Delivery time presets')}
        testID='delivery-time-presets'
      >
        {DELIVERY_TIME.presets.map((preset) => (
          <View key={preset} style={styles.presetCell}>
            <FilterChip
              size='sm'
              text={String(preset)}
              selected={shown === preset}
              disabled={disabled}
              onPress={() => { flush(); onChange(preset) }}
              testID={`delivery-time-preset-${preset}`}
              accessibilityLabel={`${preset} ${unit}`}
            />
          </View>
        ))}
      </View>

      <View style={styles.box} testID='delivery-time-box'>
        <View style={styles.stepper} testID='delivery-time-line'>
          <View style={styles.side} testID='delivery-time-minus-side'>
            <OButton
              iconOnly
              color='neutral'
              appearance={theme.native.components.stepper.base.button_appearance}
              size='md'
              icon={<Icon name='remove' size='md' />}
              disabled={disabled || shown <= DELIVERY_TIME.min}
              onClick={() => onChange(stepMinutes(settled(), -1))}
              accessibilityLabel={t('MINUTES_LESS', '_min_ minutes less').replace('_min_', step)}
              testID='delivery-time-minus'
            />
          </View>
          <View style={styles.value}>
            <MinutesValue
              ref={field}
              minutes={minutes}
              min={DELIVERY_TIME.min}
              max={DELIVERY_TIME.max}
              disabled={disabled}
              color={figureColor}
              spoken={t('DELIVERY_TIME_TAP_TO_TYPE', 'Delivery time, _min_ minutes. Tap to type a value')}
              fieldLabel={t('DELIVERY_TIME_FIELD', 'Delivery time in minutes')}
              onCommit={onChange}
              onTyping={setTyping}
              testID='delivery-time'
            />
          </View>
          <View style={styles.side} testID='delivery-time-plus-side'>
            <OButton
              iconOnly
              color='neutral'
              appearance={theme.native.components.stepper.base.button_appearance}
              size='md'
              icon={<Icon name='add' size='md' />}
              disabled={disabled || shown >= DELIVERY_TIME.max}
              onClick={() => onChange(stepMinutes(settled(), 1))}
              accessibilityLabel={t('MINUTES_MORE', '_min_ minutes more').replace('_min_', step)}
              testID='delivery-time-plus'
            />
          </View>
        </View>
      </View>
    </View>
  )
})

DeliveryTime.displayName = 'DeliveryTime'

export default DeliveryTime
