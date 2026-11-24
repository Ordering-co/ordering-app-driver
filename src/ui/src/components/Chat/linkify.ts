/**
 * The links of a chat message, as react-native-gifted-chat found them: a web
 * address (with its scheme or starting by `www.`), an email and a phone
 * number. The message is split into its plain parts and its links, each link
 * with the address it opens (`https:`, `mailto:`, `tel:`).
 */
export type MessagePart =
  | { type: 'text', text: string }
  | { type: 'url' | 'email' | 'phone', text: string, href: string }

const URL = String.raw`(?:https?:\/\/|www\.)[^\s<>]+`
const EMAIL = String.raw`[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}`
// Digits with the separators people write between them, an optional `+` before.
const PHONE = String.raw`\+?\(?\d[\d\s().-]{5,22}\d`
const LINKS = new RegExp(`(${URL})|(${EMAIL})|(${PHONE})`, 'gi')

/** What ends a sentence, not an address. */
const TRAILING = /[.,;:!?'"»)\]}]+$/

/** A date or a time (2026-11-10 12:30, 10/11/2026, 10.11.26), not a phone. */
const DATE = /^\(?\d{4}[-.\s]\d{1,2}[-.\s]\d{1,2}(?!\d)|^\(?\d{1,2}[-.]\d{1,2}[-.]\d{2,4}(?!\d)/

const PHONE_DIGITS = { min: 8, max: 15 }

/** The candidate as a phone number, or null when it is something else (a date, an amount, an order's number). */
const phoneOf = (candidate: string, before: string, after: string): string | null => {
  // Part of a longer word, number or time (`#12345678`, `12:30`, `1.234.567,89`).
  if (/[\w#:/@,$€£¥-]$/.test(before) || /^(?:[\w@/]|:\d|,\d)/.test(after)) return null
  // Balanced parentheses only.
  let text = candidate
  while (/[\s(.-]$/.test(text)) text = text.slice(0, -1)
  if ((text.match(/\(/g) ?? []).length !== (text.match(/\)/g) ?? []).length) return null
  if (DATE.test(text)) return null
  // An amount with its decimals.
  if (/^\d+[.,]\d{1,2}$/.test(text)) return null
  // A run of digits apart from the rest by two or more spaces is not one number.
  if (/\s{2,}|[.-]{2,}/.test(text)) return null
  const count = text.replace(/\D/g, '').length
  if (count < PHONE_DIGITS.min || count > PHONE_DIGITS.max) return null
  return text
}

const urlHref = (text: string) => (/^https?:\/\//i.test(text) ? text : `https://${text}`)

export const splitLinks = (message: string): MessagePart[] => {
  const parts: MessagePart[] = []
  let plain = ''
  let last = 0
  const pushPlain = () => {
    if (plain) parts.push({ type: 'text', text: plain })
    plain = ''
  }
  LINKS.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = LINKS.exec(message)) !== null) {
    const [whole, url, email, phone] = match
    const start = match.index
    let link: MessagePart | null = null
    let taken = whole
    if (url) {
      taken = url.replace(TRAILING, '')
      // A `)` that closes a parenthesis of the address itself stays in it.
      if (url.length > taken.length && url[taken.length] === ')' && (taken.match(/\(/g) ?? []).length > (taken.match(/\)/g) ?? []).length) taken += ')'
      link = taken.replace(/^(?:https?:\/\/|www\.)/i, '') ? { type: 'url', text: taken, href: urlHref(taken) } : null
    } else if (email) {
      link = { type: 'email', text: email, href: `mailto:${email}` }
    } else if (phone) {
      const number = phoneOf(phone, message.slice(0, start), message.slice(start + phone.length))
      if (number) {
        taken = number
        link = { type: 'phone', text: number, href: `tel:${number.replace(/[^\d+]/g, '')}` }
      }
    }
    plain += message.slice(last, start)
    if (link) {
      pushPlain()
      parts.push(link)
      last = start + taken.length
    } else {
      plain += whole
      last = start + whole.length
    }
    LINKS.lastIndex = last
  }
  plain += message.slice(last)
  pushPlain()
  return parts
}
