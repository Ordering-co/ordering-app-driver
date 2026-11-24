const digits = (value: unknown) => String(value ?? '').replace(/\D/g, '')

/**
 * The user's phone for OneSignal's SMS subscription, in E.164 (`+573008282222`):
 * OneSignal answers anything else with 400 "Identifier invalid format" on every
 * session. The country code and the number are joined without spaces or
 * symbols, and the national trunk zero is dropped (`0` in `07700…`). A number
 * without a country code is sent only when it already carries its `+`. Empty
 * when no valid number can be built: no SMS subscription rather than a refused one.
 */
export function oneSignalSmsNumber (user: { cellphone?: unknown, country_phone_code?: unknown } | null | undefined): string {
  const raw = String(user?.cellphone ?? '').trim()
  const phone = digits(raw)
  if (!phone) return ''
  const code = digits(user?.country_phone_code)
  const number = raw.startsWith('+')
    ? phone
    : code ? `${code}${phone.replace(/^0+/, '')}` : ''
  // E.164: at most 15 digits; a country code and a subscriber number take at least 8.
  return number.length >= 8 && number.length <= 15 ? `+${number}` : ''
}
