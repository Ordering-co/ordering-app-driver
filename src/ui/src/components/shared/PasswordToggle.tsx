import React from 'react'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { themeScoped } from '@/theme/helpers'
import Icon from './Icon'
import OButton from './OButton'

/**
 * The eye at the end of a password field: a small icon button (its box fits
 * inside the field with its border, so the field keeps the height of the
 * others; 44 pt to touch, as every button) in the input's icon size and color. The glyph says what a tap does: the open
 * eye shows the password, the crossed one hides it.
 */
interface Props {
  visible: boolean
  onToggle: () => void
  /** The scope of the field it sits in (`auth_form`, `account_page`), as `OInput`'s. */
  scope?: string
  testID?: string
}

export const PasswordToggle = ({ visible, onToggle, scope, testID }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const input = (scope ? themeScoped(theme, scope, 'input') : theme.native.components.input).base
  return (
    <OButton
      iconOnly
      color='neutral'
      appearance='ghost'
      size='sm'
      testID={testID}
      accessibilityLabel={visible ? t('HIDE_PASSWORD', 'Hide password') : t('SHOW_PASSWORD', 'Show password')}
      icon={<Icon set='mci' name={visible ? 'eye-off-outline' : 'eye-outline'} size={input.icon_size} color={input.icon_color} />}
      onClick={onToggle}
    />
  )
}

export default PasswordToggle
