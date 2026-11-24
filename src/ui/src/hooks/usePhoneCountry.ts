import { useConfig } from '@components'

/**
 * The project's default country for a phone saved without its country code: the config's `default_country_code` (an ISO country or a
 * calling code, as the phone field reads it), or undefined when the project has none. The one place the phone formats read it:
 * a screen that shows or dials a party's phone passes it on (`formatPhone`, `phoneUrl`, `partyContact`'s contacts).
 */
export const usePhoneCountry = (): string | undefined => {
  const [{ configs }] = useConfig()
  const value = configs?.default_country_code?.value
  return value == null || value === '' ? undefined : String(value)
}
