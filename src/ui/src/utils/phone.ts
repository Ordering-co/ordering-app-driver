import { parsePhoneNumberFromString } from 'libphonenumber-js/max'
import type { PhoneNumber } from 'libphonenumber-js/max'
import { callingCodeOf, isCallingCode, projectCountryOf } from '../components/PhoneInputNumber/calling'

/**
 * The app's one way of writing and dialling a phone number. An order's party (the store, the customer) and the
 * driver's own profile keep a number apart from its country's calling code (`cellphone` and `country_phone_code`),
 * and every screen that shows or dials one goes through here, so a number reads the same everywhere and a call
 * always carries its country code:
 *
 * - `formatPhone`: the INTERNATIONAL form, "+1 646 555 0129". A number that does not parse falls back to
 *   "+<code> <number>", to the bare number when there is no code and to an empty text when there is nothing.
 * - `phoneDialNumber` / `phoneUrl`: the number to dial in E.164 (`+16465550129`, no spaces) and its `tel:` link.
 *
 * A party saved without a country code gets the PROJECT's default country (the config's `default_country_code`: an ISO country or a
 * calling code, as `PhoneInputNumber` reads it; the `defaultCountry` argument, from `usePhoneCountry`): the number is read, written and
 * dialled with that code when it is a valid number of it, and stays as it was written when it is not (or the project has no default).
 * A party that HAS a code never uses the default, and one party's code is never lent to the other.
 *
 * An INPUT for a number (`PhoneInputNumber`) keeps its own behaviour: it is where a number is typed, not shown.
 * A phone written inside a chat message is the sender's text and is dialled as written (`Chat`).
 */

/** What a screen holds of a number: the number (with or without its code) and the country's calling code. */
type PhoneInput = string | number | null | undefined

/** The digits of a calling code given as such: `1`, `'+1'`, `'(+1)'`, `1787`. */
const codeOf = (code: PhoneInput): string => String(code ?? '').replace(/\D/g, '')

/** A number without what people write between its digits (spaces, dashes, dots, parentheses, slashes). */
const compactOf = (number: PhoneInput): string => String(number ?? '').trim().replace(/[\s().\-/]/g, '')

const parseOrNull = (text: string): PhoneNumber | null => {
  try {
    return parsePhoneNumberFromString(text) ?? null
  } catch {
    return null
  }
}

/** The calling code of the project's default country: a calling code as such (`1`, `+57`), or the code of an ISO country (`US`). '' for none. */
export const defaultCallingCode = (defaultCountry: PhoneInput): string => {
  const value = String(defaultCountry ?? '').trim()
  if (!value) return ''
  if (isCallingCode(value)) return codeOf(value)
  const iso = projectCountryOf(value)
  return iso ? callingCodeOf(iso) : ''
}

/** A number with no code of its own, read as a number of the project's default country: only when it is VALID there (the code is a guess). */
const resolveByDefault = (digits: string, defaultCountry?: PhoneInput): PhoneNumber | null => {
  const calling = defaultCallingCode(defaultCountry)
  if (!calling) return null
  const national = parseOrNull(`+${calling}${digits}`)
  if (national?.isValid()) return national
  const inside = digits.startsWith(calling) ? parseOrNull(`+${digits}`) : null
  return inside?.isValid() ? inside : null
}

/**
 * The number the pieces mean, or null when they do not make one. A number with its `+` carries its own code. Otherwise the
 * code in front of it is the first reading (a stored national number), and a number that already begins with its own code
 * (`16465550129` with `1`) is the second, taken only when the first is not a valid number; the first is also kept when it is
 * only a possible one (a number in the right shape of its country that no operator has yet).
 */
const resolve = (number: PhoneInput, code: PhoneInput, defaultCountry?: PhoneInput): PhoneNumber | null => {
  const compact = compactOf(number)
  if (!/^\+?\d+$/.test(compact)) return null
  const digits = compact.replace(/\D/g, '')
  if (compact.startsWith('+')) {
    const whole = parseOrNull(`+${digits}`)
    return whole && whole.isPossible() ? whole : null
  }
  const calling = codeOf(code)
  if (!calling) return resolveByDefault(digits, defaultCountry)
  const national = parseOrNull(`+${calling}${digits}`)
  if (national?.isValid()) return national
  if (digits.startsWith(calling)) {
    const inside = parseOrNull(`+${digits}`)
    if (inside?.isValid()) return inside
  }
  return national && national.isPossible() ? national : null
}

/**
 * A number as the app shows it: the international form ("+1 646 555 0129", "+57 300 1234567", "+52 55 1234 5678"). A number
 * that does not parse is "+<code> <number>" (the number as it was written); with no code, the bare number; with nothing, ''.
 */
export const formatPhone = (number: PhoneInput, code?: PhoneInput, defaultCountry?: PhoneInput): string => {
  const written = String(number ?? '').trim()
  if (!written) return ''
  const parsed = resolve(written, code, defaultCountry)
  if (parsed) return parsed.formatInternational()
  const calling = codeOf(code)
  return calling && !written.startsWith('+') ? `+${calling} ${written}` : written
}

/**
 * The number to dial, in E.164 (`+16465550129`): with its country code whenever it is known, a number that does not parse as
 * `+<code><digits>`, and the bare digits when there is no code to put in front. null when there is nothing to dial: no number, or
 * one with something other than digits in it.
 */
export const phoneDialNumber = (number: PhoneInput, code?: PhoneInput, defaultCountry?: PhoneInput): string | null => {
  const compact = compactOf(number)
  if (!/^\+?\d+$/.test(compact)) return null
  const digits = compact.replace(/\D/g, '')
  const parsed = resolve(compact, code, defaultCountry)
  if (parsed) return parsed.number
  if (compact.startsWith('+')) return `+${digits}`
  const calling = codeOf(code)
  return calling ? `+${calling}${digits}` : digits
}

/**
 * The `tel:` link of a number, always with its country code when it is known. A number that cannot be dialled says `invalid`, as
 * the app's links read it (`OLink`, `useOpenContact`: they tell the driver with a dialog and open nothing).
 */
export const phoneUrl = (number: PhoneInput, code?: PhoneInput, defaultCountry?: PhoneInput): string =>
  `tel:${phoneDialNumber(number, code, defaultCountry) ?? 'invalid'}`
