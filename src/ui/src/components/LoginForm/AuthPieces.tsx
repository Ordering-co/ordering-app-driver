import React, { useCallback, useMemo, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { ChoiceMark, KeyboardScreen, ONavbar, OText } from '../shared'
import { FloatingButton } from '../FloatingButton'
import { SafeAreaContainerLayout } from '../../layouts/SafeAreaContainer'
import { nativeTextStyle, themeControlHeight, themeGutter, themeOpacity, themePart, themeScoped, themeSpace } from '@/theme/helpers'

/**
 * Pieces shared by the auth forms (login, OTP, phone verification, forgot
 * password): `components.auth_form` and what it scopes. A scoped component is
 * the form's own look of it when the theme sets one, else the global one
 * (`themeScoped(theme, 'auth_form', '<name>')`).
 */
const AUTH = 'auth_form'

/**
 * The group the auth forms' fields are in: its `scope` of `field` puts the label above the box (`label_position: above`)
 * and its `input` is the field's look, so a form of this group is the same field as the profile's.
 */
export const AUTH_FIELD_SCOPE = AUTH

/** A component as the auth forms see it (`auth_form.scope.<name>`, or the global one). */
export const authScoped = (theme: any, name: string) => themeScoped(theme, AUTH, name)

export const useAuthStyles = () => {
  const theme: any = useTheme()
  return useMemo(() => {
    const field = authScoped(theme, 'field').base
    const timer = authScoped(theme, 'timer').base
    return StyleSheet.create({
      screen: { flex: 1 },
      // A form's blocks, `field.gap` apart, on the page's gutter (the bar over them is fixed).
      content: { paddingHorizontal: themeGutter(theme), paddingBottom: themeSpace(theme, 'lg'), gap: field.gap },
      // A screen of a code: its pieces centered, a block's space apart.
      centered: { alignItems: 'center', gap: themeSpace(theme, 'lg') },
      // The fields of a form, `field.gap` apart.
      fields: { width: '100%', gap: field.gap },
      checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: field.label_gap,
        minHeight: themeControlHeight(theme, 'md'),
      },
      checkboxLabel: { flexShrink: 1 },
      pressed: { opacity: themeOpacity(theme, 'pressed') },
      // The countdown's pill: its own height, the digits centered in it.
      timer: {
        height: timer.height,
        paddingHorizontal: timer.padding_x,
        borderRadius: timer.radius,
        backgroundColor: timer.background,
        alignItems: 'center',
        justifyContent: 'center',
      },
      timerText: { ...nativeTextStyle(timer.text), color: timer.color, textAlign: 'center' },
      timerExpired: { color: timer.expired_color },
    })
  }, [theme])
}

interface ScreenProps {
  title: string
  /** The bar's back arrow; a screen of a code has none (it has its Cancel). */
  onBack?: () => void
  /** The bar pinned under the scroll (`AuthAction`). */
  footer?: React.ReactNode
  /** The blocks are centered (a code's screen). */
  centered?: boolean
  children?: React.ReactNode
}

/**
 * A screen of the auth flow: the fixed bar with its title, a scroll with the form on the page gutter and,
 * under it, the main action pinned to the bottom. The keyboard lifts the whole, so the action and the
 * field being typed in stay in sight (as the profile's edit screens).
 */
export const AuthScreen = ({ title, onBack, footer, centered = false, children }: ScreenProps) => {
  const styles = useAuthStyles()
  return (
    <SafeAreaContainerLayout>
      <KeyboardScreen
        enabled
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.screen}
      >
        <ONavbar title={title} onBack={onBack} />
        <ScrollView
          style={styles.screen}
          contentContainerStyle={[styles.content, centered && styles.centered]}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {footer}
      </KeyboardScreen>
    </SafeAreaContainerLayout>
  )
}

interface ActionProps {
  text: string
  onPress: () => void
  /** The slot of `auth_form` that gives the button its look: the form's `submit`, or the `cancel` of a code's screen. */
  slot?: 'submit' | 'cancel'
  loading?: boolean
  disabled?: boolean
  testID?: string
}

/** The screen's main action in the app's bottom bar, in the look of the auth form's slot. */
export const AuthAction = ({ text, onPress, slot = 'submit', loading, disabled, testID }: ActionProps) => {
  const theme: any = useTheme()
  const look = themePart(theme, AUTH, `slots.${slot}`)
  return (
    <FloatingButton
      inline
      isPadding
      btnText={text}
      buttonLook={{ color: look.color, appearance: look.appearance, size: look.size }}
      loading={loading}
      disabled={disabled}
      buttonTestID={testID}
      firstButtonClick={onPress}
    />
  )
}

/**
 * A message that stays on the screen until the driver edits what it is about. It belongs to the result
 * it came with (`source`): a new result shows its own, and `clear` hides the current one.
 */
export const useUntilEdited = <T, >(source: unknown, value: T | null): [T | null, () => void] => {
  const [cleared, setCleared] = useState<unknown>(undefined)
  const clear = useCallback(() => setCleared(source), [source])
  return [cleared === source ? null : value, clear]
}

/** The reCAPTCHA v2 check row: the theme's checkbox mark and its label, the whole row to tap. */
export const RecaptchaCheckbox = ({ checked, onPress, label }: { checked: boolean, onPress: () => void, label: string }) => {
  const styles = useAuthStyles()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='checkbox'
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <View style={styles.checkboxRow}>
        <ChoiceMark kind='check' checked={checked} group={AUTH} />
        <OText style={styles.checkboxLabel}>{label}</OText>
      </View>
    </Pressable>
  )
}

/** The countdown of a code (`components.timer`), in its expired color at zero. */
export const AuthTimer = ({ text, expired = false }: { text: string, expired?: boolean }) => {
  const styles = useAuthStyles()
  return (
    <View style={styles.timer}>
      <OText style={[styles.timerText, expired && styles.timerExpired]}>{text}</OText>
    </View>
  )
}
