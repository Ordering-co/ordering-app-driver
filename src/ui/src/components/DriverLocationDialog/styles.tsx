import { StyleSheet } from 'react-native'
import { themeSpace } from '@/theme/helpers'

/** The dialog's two buttons, side by side in the modal's box. */
export const actionsStyles = (theme: any) => StyleSheet.create({
  actions: { flexDirection: 'row', gap: themeSpace(theme, 'sm') },
  action: { flex: 1 }
})
