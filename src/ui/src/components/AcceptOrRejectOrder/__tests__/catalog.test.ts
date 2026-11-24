import { DRIVER_ORDER_TITLES } from '../driverActions'

const catalog: Record<string, Record<string, string>> = require('../../../../../../i18n/translations.json')
const config = require('../../../../../../i18n/config.json')
const locales: string[] = config.supportedLocales

describe('the texts of the accept / reject views are in the catalog', () => {
  // The i18n scan reads a `t` call written with its key and text in place; these keys travel in a map and are read by
  // `t(entry.key, entry.text)`, so nothing else holds them to the catalog (REJECT_ORDER escaped it).
  const entries = Object.entries(DRIVER_ORDER_TITLES).flatMap(([action, entry]) => [
    [`${action}.title`, entry.key, entry.text],
    [`${action}.button`, entry.btnKey, entry.btnText]
  ])

  it.each(entries)('%s: %s is in every locale and its English is the text written in the code', (_where, key, text) => {
    const entry = catalog[key]
    expect(entry).toBeDefined()
    expect(entry.en).toBe(text)
    locales.forEach((locale) => expect((entry[locale] ?? '').trim()).not.toBe(''))
  })

  it('the single reject title is "Reject order", written like Accept order', () => {
    expect(catalog.ACCEPT_ORDER.en).toBe('Accept order')
    expect(catalog.REJECT_ORDER.en).toBe('Reject order')
    expect(DRIVER_ORDER_TITLES.reject.text).toBe('Reject order')
  })
})

describe('the note to the customer reads in the singular, in every locale', () => {
  const singular = catalog.YOUR_CUSTOMER_WILL_RECEIVE_A_NOTIFICATION_ABOUT_THIS_ACTIONS
  const plural = catalog.YOUR_CUSTOMERS_WILL_RECEIVE_A_NOTIFICATION_ABOUT_THIS_ACTION

  it('says "this action" as the note to the customers does (the key keeps its old name)', () => {
    expect(singular.en).toBe('Your customer will receive a notification about this action')
    // The end of each sentence (the action) is the same in both: the old text ended in the plural, "these actions".
    const expectedEnd: Record<string, string> = {
      es: 'esta acción', fr: 'cette action', it: 'questa azione', de: 'diese Aktion', pt: 'esta ação', da: 'denne handling',
      nl: 'deze actie', ar: 'هذا الإجراء', el: 'αυτή την ενέργεια', bg: 'това действие', tr: 'bu işlemle'
    }
    locales.forEach((locale) => {
      expect(singular[locale]).toContain(expectedEnd[locale])
      expect(plural[locale]).toContain(expectedEnd[locale])
    })
  })

  it('has no plural left over from the old typo', () => {
    const leftovers: Record<string, string[]> = {
      es: ['estas acciones'], fr: ['ces actions'], it: ['queste azioni'], pt: ['essas ações'], da: ['disse handlinger'],
      nl: ['deze acties'], ar: ['هذه الإجراءات'], el: ['αυτές τις ενέργειες'], bg: ['тези действия'], tr: ['bu işlemlerle']
    }
    Object.entries(leftovers).forEach(([locale, words]) => words.forEach((word) => expect(singular[locale]).not.toContain(word)))
  })
})

describe('the question about a status change of a group', () => {
  it('names the group in every locale (with the count and the number) and keeps the old text for a group with no number', () => {
    locales.concat('en').forEach((locale) => {
      expect(catalog.QUESTION_GROUP_ACTION[locale]).toContain('_count_')
      expect(catalog.QUESTION_GROUP_ACTION[locale]).toContain('_group_')
      expect(catalog.QUESTION_GROUP_ACTION_NO_NUMBER[locale]).toContain('_count_')
      expect(catalog.QUESTION_GROUP_ACTION_NO_NUMBER[locale]).not.toContain('_group_')
    })
    expect(catalog.QUESTION_GROUP_ACTION.en).toBe('This changes the _count_ orders of group No. _group_ at once. Continue?')
    expect(catalog.QUESTION_GROUP_ACTION_NO_NUMBER.en).toBe('This changes the _count_ orders of the group at once. Continue?')
  })
})

describe('the texts the view reads straight with `t` (group titles, the photo offline)', () => {
  const source: string = require('fs').readFileSync(require('path').join(__dirname, '../index.tsx'), 'utf8')
  const texts: Array<[string, string, boolean]> = [
    ['ACCEPT_ORDERS', 'Accept _count_ orders', true],
    ['REJECT_ORDERS', 'Reject _count_ orders', true],
    ['PICKUP_FAILED_FOR_ORDERS', 'Pickup failed for _count_ orders', true],
    ['DELIVERY_FAILED_FOR_ORDERS', 'Delivery failed for _count_ orders', true],
    ['ORDERS_NOT_READY', '_count_ orders not ready', true],
    ['ARRIVED_TO_BUSINESS_FOR_ORDERS', 'Arrived to business for _count_ orders', true],
    ['PICKUP_COMPLETE_FOR_ORDERS', 'Pickup complete for _count_ orders', true],
    ['DELIVERY_COMPLETE_FOR_ORDERS', 'Delivery complete for _count_ orders', true],
    ['IMAGE_REQUIRES_CONNECTION', 'You need an internet connection to send the photo', false]
  ]

  it.each(texts)('%s is in every locale, written in the code as its English, with its count where it has one', (key, text, hasCount) => {
    expect(source).toContain(`t('${key}', '${text}')`)
    expect(catalog[key].en).toBe(text)
    locales.forEach((locale) => {
      expect((catalog[key][locale] ?? '').trim()).not.toBe('')
      expect(catalog[key][locale].includes('_count_')).toBe(hasCount)
    })
  })

  it('every step of a group has its title: the view picks them by the action\'s name', () => {
    ;['accept', 'reject', 'pickupFailed', 'deliveryFailed', 'notReady', 'arrivedToBusiness', 'pickupComplete', 'deliveryComplete'].forEach((action) => {
      expect(source).toMatch(new RegExp(`^\\s+${action}: t\\('[A-Z_]+', '.*_count_.*'\\),?$`, 'm'))
    })
  })

  it('has no text for a group that needs a connection: a group waits in the queue as one change per order', () => {
    expect(catalog.GROUP_REQUIRES_CONNECTION).toBeUndefined()
    expect(source).not.toContain('GROUP_REQUIRES_CONNECTION')
  })
})

describe('the texts of the delivery time (one number of minutes) are in the catalog', () => {
  // [key, the English the code writes as its fallback, the placeholders every locale keeps]
  const keys: Array<[string, string, string[]]> = [
    ['DELIVERY_TIME_PRESETS', 'Delivery time presets', []],
    ['DELIVERY_TIME_TAP_TO_TYPE', 'Delivery time, _min_ minutes. Tap to type a value', ['_min_']],
    ['DELIVERY_TIME_FIELD', 'Delivery time in minutes', []],
    ['MINUTES_TYPE_HINT', 'Minutes, from _min_ to _max_', ['_min_', '_max_']],
    ['MINUTES_RANGE_ERROR', 'Enter a time from _min_ to _max_ minutes', ['_min_', '_max_']],
    ['MINUTES_LESS', '_min_ minutes less', ['_min_']],
    ['MINUTES_MORE', '_min_ minutes more', ['_min_']]
  ]

  it.each(keys)('%s is in every locale, translated, with its placeholders', (key, english, placeholders) => {
    const entry = catalog[key]
    expect(entry).toBeDefined()
    expect(entry.en).toBe(english)
    locales.forEach((locale) => {
      const text = (entry[locale] ?? '').trim()
      expect(text).not.toBe('')
      // Not the English left in place, and each placeholder the control replaces is still there.
      expect(text).not.toBe(english)
      placeholders.forEach((placeholder) => expect(text).toContain(placeholder))
    })
  })

  it('reuses the catalog\'s own words: "Delivery time" and the unit "min" (TIME_MIN), and adds no key for them', () => {
    expect(catalog.DELIVERY_TIME.en).toBe('Delivery time')
    expect(catalog.TIME_MIN.en).toBe('min')
    expect(catalog.MINUTES_UNIT).toBeUndefined()
  })
})
