import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Keyboard, Pressable, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { nativeTextStyle, themeOpacity } from '@/theme/helpers'
import FieldError from './FieldError'
import OInput from './OInput'
import OText from './OText'

/**
 * What a sheet learns when it asks the value to settle (`flush`): `value` is the minutes typed and accepted (null when
 * nothing was being typed, or the typing was empty and the previous value stays), `corrected` is true when the typed
 * number was outside the limits and was brought to the nearest one instead (the sheet shows the corrected time and
 * waits for the next tap, so a mistyped "500" never goes out as 180 without being seen).
 */
export interface MinutesFlush { value: number | null, corrected: boolean }

export interface MinutesValueHandle {
  /** Ends the typing as the keyboard's Done would, and says what came of it. Used by the sheet's own buttons. */
  flush: () => MinutesFlush
  /** The figure is a field now (being typed in). Read at the moment of the question: a tap that ends the typing asks first. */
  isEditing: () => boolean
}

interface Props {
  /** The minutes now (what the sheet would send). */
  minutes: number
  /** The inclusive limits of what can be typed. When `min > max` nothing can be typed and the figure is plain. */
  min: number
  max: number
  disabled?: boolean
  /** The ink of the figure at rest and of the typed digits; the stepper's (`components.stepper.base.value_color`) by default. */
  color?: string
  /** What a screen reader says for the figure at rest, `_min_` replaced by the minutes ("Delivery time, _min_ minutes. Tap to type a value"). */
  spoken: string
  /** What a screen reader says for the field while it is typed in ("Delivery time in minutes"). */
  fieldLabel: string
  /** The line under the field while typing, `_min_` and `_max_` replaced; the default says "Minutes, from _min_ to _max_". */
  hint?: string
  /** Called with the minutes the typing ended on (already inside the limits). */
  onCommit: (minutes: number) => void
  /**
   * Called while typing with the number in the field when it is inside the limits, and with null when it is not, when the
   * field is empty and when the typing ends: what the sheet's own texts (the selected preset) follow.
   */
  onTyping?: (minutes: number | null) => void
  /** The figure's id; the button around it is `<id>-edit`, the field `<id>-input`, the hint `<id>-caption`, the error `<id>-error`. */
  testID: string
}

/** The digits of what was typed: no sign, no point, no letters, three at most (the limits' maximum has three). */
export const digitsOnly = (value: string): string => String(value ?? '').replace(/\D/g, '').slice(0, 3)

/**
 * The height of the stepper's line: the field's (`input.sizes.md`), the stepper buttons' (`button.sizes.md`) or the
 * stepper's own (`stepper.sizes.md`), the tallest. The figure's button, the field and the boxes of the sheet's minus and
 * plus all take it, so the three stay level whether the number is at rest or being typed.
 */
export const minutesLineHeight = (theme: any): number => {
  const { input, button, stepper } = theme.native.components
  return Math.max(input.sizes.md.height, button.sizes.md.height, stepper.sizes.md.height)
}

const fill = (text: string, min: number, max: number) => text.replace('_min_', String(min)).replace('_max_', String(max))

/**
 * A number of minutes as a figure that can be typed over (the delivery time of the accept sheet). At rest it is the
 * stepper's figure (`components.stepper.base.value`), in a button with the pressed state that says "Tap to type a value" to a
 * screen reader: no glyph beside it, tapping the number is the way in (the owner's choice, 2026-11-23). Tapped, it becomes a
 * field of the app's own `OInput` (the numbers keyboard, digits only, three at most) holding the minutes, with the unit after
 * them and no button of its own. Return / Done on the keyboard, leaving the field, putting the keyboard away and the sheet's own
 * buttons (Accept, the presets, the stepper) all end the typing: an empty field restores the previous value, a number outside
 * `min`..`max` is brought to the nearest limit (and said while typed). Any change of `minutes` from outside (a preset, the
 * stepper) ends the typing too: the last tap wins.
 *
 * The figure's button and the field are one line of the same height (`minutesLineHeight`), so the sheet's minus and plus,
 * each centred in a box of that height, stay level with the number at rest and with the field while typing, and nothing moves
 * when the typing starts. The field never takes the focus by itself: only a tap on the figure opens it.
 */
export const MinutesValue = forwardRef<MinutesValueHandle, Props>(({
  minutes, min, max, disabled = false, color, spoken, fieldLabel, hint, onCommit, onTyping, testID
}, ref) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const stepper = theme.native.components.stepper
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const editingRef = useRef(false)
  const draftRef = useRef('')
  const canType = !disabled && min <= max

  const styles = useMemo(() => {
    const figure = { ...nativeTextStyle(stepper.base.value), color: color ?? stepper.base.value_color, textAlign: 'center' as const }
    return StyleSheet.create({
      column: { alignItems: 'center', alignSelf: 'stretch' },
      // The target is the stepper's line (never under the smallest touch target), whatever the figure's own height.
      press: { minHeight: minutesLineHeight(theme), flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
      pressed: { opacity: themeOpacity(theme, 'pressed') },
      figure,
      // The typed digits are the same figure, in the field's box.
      typed: figure,
      unit: { alignSelf: 'center' },
      // The line under the field, one height for its two texts. They sit side by side, each as wide as the line, and the
      // line clips what is not shown, so its height is the taller of the two at any text size (the error may wrap where
      // the hint does not) and the sheet does not move when one replaces the other. Both start `message_gap` under the field,
      // where a field's error starts.
      message: { alignSelf: 'stretch', flexDirection: 'row', overflow: 'hidden' },
      messageCell: { width: '100%', flexShrink: 0, paddingTop: theme.native.components.field.base.message_gap },
      hintCell: { alignItems: 'center' },
      // The error's own gap is the cell's.
      noGap: { marginTop: 0 },
      // The hint steps aside, out of the clipped line, while the error shows.
      aside: { marginLeft: '-100%' }
    })
  }, [theme, stepper, color])

  // The caller's callbacks may be new on every render: the typing must not end because the sheet drew again.
  const typingRef = useRef(onTyping)
  typingRef.current = onTyping

  const setEditingNow = useCallback((on: boolean) => {
    editingRef.current = on
    setEditing(on)
    if (!on) typingRef.current?.(null)
  }, [])

  const settle = useCallback((): MinutesFlush => {
    if (!editingRef.current) return { value: null, corrected: false }
    const typed = draftRef.current
    setEditingNow(false)
    // Empty: nothing to say, the previous value stays.
    if (typed === '') return { value: null, corrected: false }
    const wanted = Number(typed)
    const inside = Math.min(max, Math.max(min, wanted))
    onCommit(inside)
    return { value: inside, corrected: inside !== wanted }
  }, [max, min, onCommit, setEditingNow])

  useImperativeHandle(ref, () => ({ flush: settle, isEditing: () => editingRef.current }), [settle])

  // A change that did not come from this field (a preset, the stepper) wins over what was being typed.
  useEffect(() => { if (editingRef.current) setEditingNow(false) }, [minutes, setEditingNow])

  // Putting the keyboard away ends the typing too, as leaving the field does: Android's back key and the iPad's "hide
  // keyboard" close the keyboard without taking the focus from the field, so no blur tells the field it is done.
  useEffect(() => {
    if (!editing) return undefined
    const hidden = Keyboard.addListener('keyboardDidHide', () => { settle() })
    return () => hidden.remove()
  }, [editing, settle])

  const begin = () => {
    draftRef.current = String(minutes)
    setDraft(draftRef.current)
    setEditingNow(true)
  }
  const type = (value: string) => {
    draftRef.current = digitsOnly(value)
    setDraft(draftRef.current)
    const typed = draftRef.current === '' ? null : Number(draftRef.current)
    typingRef.current?.(typed !== null && typed >= min && typed <= max ? typed : null)
  }

  const outside = draft !== '' && (Number(draft) < min || Number(draft) > max)
  const unit = t('TIME_MIN', 'min')
  const label = spoken.replace('_min_', String(minutes))

  if (!editing) {
    return (
      <View style={styles.column}>
        <Pressable
          style={({ pressed }) => [styles.press, pressed && canType && styles.pressed]}
          onPress={canType ? begin : undefined}
          disabled={!canType}
          accessibilityRole={canType ? 'button' : 'text'}
          accessibilityLabel={canType ? label : undefined}
          testID={`${testID}-edit`}
        >
          <OText style={styles.figure} testID={testID}>{`${minutes} ${unit}`}</OText>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.column}>
      <OInput
        autoFocus
        isValueSync
        value={draft}
        onChange={type}
        type='number-pad'
        keyboardType='number-pad'
        returnKeyType='done'
        maxLength={3}
        hasError={outside}
        inputStyle={styles.typed}
        accessibilityLabel={fieldLabel}
        onSubmitEditing={settle}
        onBlur={settle}
        iconCustomRight={<OText preset='body' color='text_muted' style={styles.unit}>{unit}</OText>}
        testID={`${testID}-input`}
      />
      <View style={styles.message} testID={`${testID}-message`}>
        {/* The text that is not shown stays in the line, so the line keeps the taller one's height, but not for a screen reader. */}
        <View
          style={[styles.messageCell, styles.hintCell, outside && styles.aside]}
          accessibilityElementsHidden={outside}
          importantForAccessibility={outside ? 'no-hide-descendants' : 'auto'}
        >
          <OText preset='body_sm' color='text_muted' testID={outside ? undefined : `${testID}-caption`}>{fill(hint ?? t('MINUTES_TYPE_HINT', 'Minutes, from _min_ to _max_'), min, max)}</OText>
        </View>
        <View
          style={styles.messageCell}
          accessibilityElementsHidden={!outside}
          importantForAccessibility={outside ? 'auto' : 'no-hide-descendants'}
        >
          <FieldError style={styles.noGap} testID={outside ? `${testID}-error` : undefined}>{fill(t('MINUTES_RANGE_ERROR', 'Enter a time from _min_ to _max_ minutes'), min, max)}</FieldError>
        </View>
      </View>
    </View>
  )
})

MinutesValue.displayName = 'MinutesValue'

export default MinutesValue
