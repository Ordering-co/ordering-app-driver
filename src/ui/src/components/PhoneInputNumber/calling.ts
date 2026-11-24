import { getCountryCallingCode, parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js/max'
import metadata from 'libphonenumber-js/max/metadata'

/**
 * The calling code of a country and the country of a calling code, for the
 * phone field. Resolved by ISO from the app's own country data (`countries.ts`: the rows of
 * the sheet, Puerto Rico has two codes, the Caribbean countries their four
 * digits) and, for a country it does not have, from libphonenumber-js. Never from the submodule's `CODES` table, which has wrong
 * codes (CZ 42, GE 7880, UZ 7…) and lacks countries (PK, RS, CI…).
 */

/** A country of the sheet (`countries.ts`). */
export type PickerCountry = { cca2: string, callingCode?: string[], [key: string]: any }

/** The calling code and the country of the field. */
export type Calling = { countryCode: string, code: string }

export const digits = (value: unknown) => String(value ?? '').replace(/\D/g, '')

/** A number as typed or pasted, without what people write between its digits (spaces, dashes, dots, parentheses). */
export const withoutSeparators = (value: string) => value.replace(/[\s().\-/]/g, '')

/** A calling code given as such (`52`, `+52`, 1787), not an ISO country. */
export const isCallingCode = (value: unknown) => /^\+?\d+$/.test(String(value ?? '').trim())

const pickerCountry = (iso: string, countries: PickerCountry[]) =>
  countries.find(country => country.cca2 === iso)

/** The calling codes of a country: the picker's (one or more), or libphonenumber-js's. */
export const callingCodesOf = (iso: string | null | undefined, countries: PickerCountry[] = []): string[] => {
  const country = (iso ?? '').toUpperCase()
  if (!country) return []
  const picked = pickerCountry(country, countries)?.callingCode?.filter(Boolean) ?? []
  if (picked.length > 0) return picked
  try {
    return [String(getCountryCallingCode(country as CountryCode))]
  } catch {
    return []
  }
}

/** The calling code of a country (its first one), '' for a country nobody knows. */
export const callingCodeOf = (iso: string | null | undefined, countries: PickerCountry[] = []) =>
  callingCodesOf(iso, countries)[0] ?? ''

/** The main country of a calling code (1 → US, 7 → RU, 420 → CZ, 1787 → PR). */
export const countryOfCallingCode = (callingCode: unknown, countries: PickerCountry[] = []): string | null => {
  const code = digits(callingCode)
  if (!code) return null
  const main = (metadata as any).country_calling_codes?.[code]?.[0]
  if (main) return main
  // A code only the picker has (a Caribbean country's four digits).
  const picked = countries.find(country => country.callingCode?.includes(code))
  if (picked) return picked.cca2
  // Its longest beginning that is a calling code (1787 → 1 → US) until the picker loads.
  for (let length = code.length - 1; length > 0; length--) {
    const shorter = (metadata as any).country_calling_codes?.[code.slice(0, length)]?.[0]
    if (shorter) return shorter
  }
  return null
}

/**
 * The country the project is set to (`default_country_code`): an ISO country as such, a calling
 * code (`+52`, `52`) as its main country, whatever case or spaces; null when it is neither
 * (empty, `XX`), so nothing downstream gets a prefix where an ISO country is expected.
 */
export const projectCountryOf = (value: unknown, countries: PickerCountry[] = []): string | null => {
  const text = String(value ?? '').trim()
  if (!text) return null
  if (isCallingCode(text)) return countryOfCallingCode(text, countries)
  const iso = text.toUpperCase()
  return callingCodeOf(iso, countries) ? iso : null
}

/**
 * The field's default country and calling code.
 * - `defaultCode` numeric (the user's saved `country_phone_code`): that code as it is, with its country.
 * - `defaultCode` an ISO country, or the project's default country: the country's code, by ISO.
 * - A country with two calling codes (Puerto Rico) keeps the user's own one (`fallbackCode`).
 */
export const resolveDefaultCalling = (
  { defaultCode, configCountry, fallbackCode, subOptionCountries = [] }:
  { defaultCode?: unknown, configCountry?: string | null, fallbackCode?: unknown, subOptionCountries?: string[] },
  countries: PickerCountry[] = []
): Calling => {
  const projectCountry = projectCountryOf(configCountry, countries) ?? ''
  if (defaultCode !== null && defaultCode !== undefined && defaultCode !== '' && isCallingCode(defaultCode)) {
    const code = digits(defaultCode)
    return { countryCode: countryOfCallingCode(code, countries) ?? (projectCountry || 'US'), code }
  }
  const country = String(defaultCode ?? '').toUpperCase()
  if (country) {
    const own = subOptionCountries.includes(country) ? digits(fallbackCode) : ''
    const code = own || callingCodeOf(country, countries)
    if (code) return { countryCode: country, code }
  }
  const projectCode = callingCodeOf(projectCountry, countries)
  if (projectCode) return { countryCode: projectCountry, code: projectCode }
  return { countryCode: 'US', code: '1' }
}

/**
 * A whole number typed or pasted with its `+` and calling code
 * (`+52 55 1234 5678`): its country, the calling code as the picker has it and
 * the national number. Null while it is not a number yet (still being typed);
 * `lenient` (the project validates no numbers) takes a possible one.
 */
export const parseFullNumber = (text: string, countries: PickerCountry[] = [], lenient = false): (Calling & { number: string }) | null => {
  const entered = text.trim()
  if (!entered.startsWith('+')) return null
  let parsed
  try {
    parsed = parsePhoneNumberFromString(entered)
  } catch {
    parsed = undefined
  }
  if (!parsed || !(parsed.isValid() || (lenient && parsed.isPossible()))) return null
  const countryCode = parsed.country ?? countryOfCallingCode(parsed.countryCallingCode, countries)
  if (!countryCode) return null
  const whole = `${parsed.countryCallingCode}${parsed.nationalNumber}`
  const code = callingCodesOf(countryCode, countries)
    .filter(candidate => whole.startsWith(candidate) && candidate.length < whole.length)
    .sort((a, b) => b.length - a.length)[0] ?? String(parsed.countryCallingCode)
  return { countryCode, code, number: whole.slice(code.length) }
}

/**
 * The national number of what was typed after the calling code, as its
 * country writes it: without the trunk prefix where there is one (UK
 * `07400 123456` → `7400123456`, DE `030 123456` → `30123456`) and with the
 * zero that is part of the number where there is none (IT `06 1234 5678` →
 * `0612345678`). Null when it is not a number of the country: the caller keeps
 * its own way then.
 */
export const nationalNumberOf = (typed: string, calling: Calling): string | null => {
  const national = withoutSeparators(typed)
  if (!national || !calling.code) return null
  let parsed
  try {
    parsed = parsePhoneNumberFromString(`+${calling.code}${national}`, calling.countryCode as CountryCode)
  } catch {
    parsed = undefined
  }
  if (!parsed || !parsed.isValid()) return null
  // After the field's own calling code (the picker's: +1787 for Puerto Rico).
  const whole = `${parsed.countryCallingCode}${parsed.nationalNumber}`
  return whole.startsWith(calling.code) && whole.length > calling.code.length ? whole.slice(calling.code.length) : null
}
