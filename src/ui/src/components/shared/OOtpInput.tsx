import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, TextInput, TextInputInstance, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { nativeBoxStyle, nativeTextStyle } from '@/theme/helpers'
import OText from './OText'
import { useLanguage } from '@components'

/**
 * A code typed digit by digit (a login code, a phone verification, a delivery
 * PIN): one look for every code of the app (decision D6), the theme's input at
 * its `code` size (`components.input.sizes.code`), as many cells as the code
 * has. One hidden field takes the typing, so pasting and the keyboard's code
 * suggestion fill every cell.
 */
interface Props {
  length: number
  value: string
  onChange: (code: string) => void
  /** Called once with the whole code when its last digit is typed. */
  onComplete?: (code: string) => void
  autoFocus?: boolean
  disabled?: boolean
  hasError?: boolean
  /** The digits are shown as dots (a PIN). */
  secure?: boolean
  testID?: string
  /** What a screen reader says of the entry; by default "Enter verification code", translated. */
  accessibilityLabel?: string
}

/** What a screen can ask of the code entry: `ref.current?.focus()`. */
export type OOtpInputHandle = { focus: () => void, blur: () => void }

export const OOtpInput = forwardRef<OOtpInputHandle, Props>(({ length, value, onChange, onComplete, autoFocus, disabled, hasError, secure, testID, accessibilityLabel }, ref) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const field = useRef<TextInputInstance>(null)
  useImperativeHandle(ref, () => ({ focus: () => field.current?.focus(), blur: () => field.current?.blur() }), [])
  const [focused, setFocused] = useState(false)
  const input = theme.native.components.input
  const styles = useMemo(() => {
    const code = input.sizes.code
    const states = input.variants.default.states
    return StyleSheet.create({
      row: { flexDirection: 'row', justifyContent: 'center', gap: code.gap },
      // A cell is its theme width, and narrower when the row cannot hold every cell (a long code on a small phone).
      cell: {
        flexBasis: code.width,
        flexShrink: 1,
        maxWidth: code.width,
        height: code.height,
        borderRadius: input.base.radius,
        alignItems: 'center',
        justifyContent: 'center',
        ...nativeBoxStyle(input.base),
      },
      focus: nativeBoxStyle(states.focus),
      error: nativeBoxStyle(states.error),
      disabled: nativeBoxStyle(states.disabled),
      digit: { ...nativeTextStyle(code.text), color: input.base.text_color },
      hidden: { position: 'absolute', opacity: 0, width: '100%', height: '100%' },
    })
  }, [input])

  const type = (text: string) => {
    const code = text.replace(/\D/g, '').slice(0, length)
    onChange(code)
    if (code.length === length && code !== value) onComplete?.(code)
  }

  return (
    <Pressable onPress={() => field.current?.focus()} disabled={disabled} testID={testID} accessibilityLabel={accessibilityLabel ?? t('ENTER_VERIFICATION_CODE', 'Enter verification code')}>
      <View style={styles.row}>
        {Array.from({ length }, (_, index) => (
          <View
            key={index}
            style={[
              styles.cell,
              focused && index === Math.min(value.length, length - 1) && styles.focus,
              hasError && styles.error,
              disabled && styles.disabled,
            ]}
          >
            <OText style={styles.digit}>{value[index] ? (secure ? '•' : value[index]) : ''}</OText>
          </View>
        ))}
      </View>
      <TextInput
        ref={field}
        testID={testID ? `${testID}-field` : undefined}
        value={value}
        onChangeText={type}
        keyboardType='number-pad'
        textContentType='oneTimeCode'
        autoComplete='sms-otp'
        maxLength={length}
        autoFocus={autoFocus}
        editable={!disabled}
        caretHidden
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hidden}
      />
    </Pressable>
  )
})

export default OOtpInput
