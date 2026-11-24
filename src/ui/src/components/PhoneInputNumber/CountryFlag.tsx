import React from 'react'
import { StyleProp, TextStyle } from 'react-native'
import { useTheme } from 'styled-components/native'
import { themeValue } from '@/theme/helpers'
import { FlagEmoji } from './styles'

/**
 * A country's flag as its emoji (the two regional indicators of its ISO 3166
 * code): it draws offline, at once, in the system's flag set, in place of the
 * flag images of the country picker library. `size` is the flag's height (an
 * icon size of the theme); its line is the body text's ratio.
 */
const REGIONAL_INDICATOR_A = 0x1f1e6

export const flagEmoji = (isoCode?: string | null): string => {
  const code = String(isoCode ?? '').trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return ''
  return String.fromCodePoint(...[...code].map(letter => REGIONAL_INDICATOR_A + letter.charCodeAt(0) - 65))
}

type CountryFlagProps = {
  isoCode?: string | null
  size: number
  style?: StyleProp<TextStyle>
}

export const CountryFlag = ({ isoCode, size, style }: CountryFlagProps) => {
  const theme: any = useTheme()
  const emoji = flagEmoji(isoCode)
  if (!emoji) return null
  return (
    <FlagEmoji
      $size={size}
      $line={Math.round(size * themeValue(theme, 'tokens.typography.body.line'))}
      style={style}
      accessibilityLabel={String(isoCode).toUpperCase()}
      allowFontScaling={false}
    >
      {emoji}
    </FlagEmoji>
  )
}

export default CountryFlag
