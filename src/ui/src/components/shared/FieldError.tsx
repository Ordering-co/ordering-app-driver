import React, { useMemo } from 'react'
import { StyleSheet, TextStyle } from 'react-native'
import { useTheme } from 'styled-components/native'
import OText from './OText'
import { nativeTextStyle, themeScoped } from '@/theme/helpers'

/**
 * A field's error message, under its field: `components.field` (`error` is its
 * text, `error_color` its color, `message_gap` the space over it). It starts
 * where the field starts, whatever its host's alignment; `center` is for an
 * error under a centered code entry.
 *
 *   <FieldError>{errors.email.message}</FieldError>
 *   <FieldError center>{codeError}</FieldError>
 */
interface Props {
  children: React.ReactNode
  /** Centered, under a centered code entry. */
  center?: boolean
  /** The group the field is in (`auth_form`, `account_page`): its `scope` of `field`, when it has one, is the look. */
  scope?: string
  style?: TextStyle
  testID?: string
}

export const FieldError = ({ children, center = false, scope, style, testID }: Props) => {
  const theme: any = useTheme()
  const styles = useMemo(() => {
    const field = (scope ? themeScoped(theme, scope, 'field') : theme.native.components.field).base
    return StyleSheet.create({
      // As wide as its host, so the text's side is this component's and not the host's `alignItems`.
      error: {
        ...nativeTextStyle(field.error),
        color: field.error_color,
        marginTop: field.message_gap,
        alignSelf: 'stretch',
        textAlign: 'auto',
      },
      center: { textAlign: 'center' },
    })
  }, [theme, scope])
  return <OText style={[styles.error, center && styles.center, style]} testID={testID}>{children}</OText>
}

export default FieldError
