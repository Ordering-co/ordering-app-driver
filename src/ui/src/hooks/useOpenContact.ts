import { Linking } from 'react-native'
import { useLanguage } from '@components'
import { useNotice } from '../components/shared/confirmAction'
import { opensWithoutAsking } from '../utils/links'

/**
 * Opens a link (a party's `tel:` or `mailto:`, the maps apps' links of the route) as the app's links do (`OLink`): a number that is
 * not dialable (`invalid`) or a link the phone cannot open says so with the app's dialog. The system's own schemes (`tel:`, `sms:`,
 * `mailto:`, see `utils/links`) are opened straight away and a refusal is the dialog; any other scheme is asked first
 * (`Linking.canOpenURL`), so a maps app that is not there is told, not tried.
 */
export const useOpenContact = () => {
  const [, t] = useLanguage()
  const notify = useNotice()

  const alert = (message: string) =>
    notify({ title: t('ERROR_OPENING_THE_LINK', 'Error opening the link'), message })

  return async (url: string) => {
    if (url.includes('tel:') && url.includes('invalid')) {
      alert(t('INVALID_NUMBER', 'Invalid number'))
      return
    }
    try {
      if (opensWithoutAsking(url) || await Linking.canOpenURL(url)) await Linking.openURL(url)
      else alert(t('LINK_UNSUPPORTED', 'Link could not be opened or is not supported'))
    } catch (error) {
      alert(t('LINK_UNSUPPORTED', 'Link could not be opened or is not supported'))
    }
  }
}
