import { formatPhone, phoneDialNumber, phoneUrl } from '../phone'

describe('formatPhone: the international form, whatever the country', () => {
  it.each([
    ['a US number', '6465550129', '1', '+1 646 555 0129'],
    ['a Colombian mobile', '3001234567', '57', '+57 300 1234567'],
    ['a Mexican number', '5512345678', '52', '+52 55 1234 5678'],
    ['a Spanish mobile', '612345678', '34', '+34 612 34 56 78']
  ])('%s', (_name, number, code, expected) => {
    expect(formatPhone(number, code)).toBe(expected)
  })

  it('takes the code as the API or a form gives it: with a plus, as a number, with brackets', () => {
    expect(formatPhone('6465550129', '+1')).toBe('+1 646 555 0129')
    expect(formatPhone('6465550129', 1)).toBe('+1 646 555 0129')
    expect(formatPhone('6465550129', '(+1)')).toBe('+1 646 555 0129')
  })

  it('writes a number the same whatever separators it was stored with', () => {
    expect(formatPhone('(646) 555-0129', '1')).toBe('+1 646 555 0129')
    expect(formatPhone('646.555.0129', '1')).toBe('+1 646 555 0129')
    expect(formatPhone(' 300 123 4567 ', '57')).toBe('+57 300 1234567')
  })

  it('a number with its code already inside is not given the code twice', () => {
    expect(formatPhone('+16465550129', '1')).toBe('+1 646 555 0129')
    expect(formatPhone('16465550129', '1')).toBe('+1 646 555 0129')
    expect(formatPhone('573001234567', '57')).toBe('+57 300 1234567')
    expect(formatPhone('+573001234567', '57')).toBe('+57 300 1234567')
    expect(formatPhone('+573001234567')).toBe('+57 300 1234567')
  })

  it('a number with a plus keeps its own code, whatever code the party says', () => {
    expect(formatPhone('+573001234567', '1')).toBe('+57 300 1234567')
  })

  it('drops the trunk zero a national number is written with', () => {
    expect(formatPhone('07400123456', '44')).toBe('+44 7400 123456')
  })

  it('a number that does not parse is "+<code> <number>"', () => {
    expect(formatPhone('12345', '1')).toBe('+1 12345')
    expect(formatPhone('call me', '57')).toBe('+57 call me')
    expect(formatPhone('6465550129129', '1')).toBe('+1 6465550129129')
  })

  it('a number that does not parse keeps the plus it has, and is bare with no code', () => {
    expect(formatPhone('+12345')).toBe('+12345')
    expect(formatPhone('12345')).toBe('12345')
    expect(formatPhone('6465550129')).toBe('6465550129')
    expect(formatPhone('6465550129', '')).toBe('6465550129')
    expect(formatPhone('6465550129', null)).toBe('6465550129')
  })

  it('is an empty text for nothing', () => {
    expect(formatPhone(undefined, '1')).toBe('')
    expect(formatPhone(null)).toBe('')
    expect(formatPhone('', '1')).toBe('')
    expect(formatPhone('   ', '1')).toBe('')
  })

  it('an unknown number of the right shape (not valid) is still written internationally', () => {
    expect(formatPhone('5550104477', '1')).toBe('+1 555 010 4477')
  })
})

describe('phoneDialNumber and phoneUrl: always with the country code when it is known', () => {
  it.each([
    ['a US number', '6465550129', '1', '+16465550129'],
    ['a Colombian mobile', '3001234567', '57', '+573001234567'],
    ['a Mexican number', '5512345678', '52', '+525512345678'],
    ['a number written with separators', '(646) 555-0129', '+1', '+16465550129'],
    ['a number with its code already inside', '16465550129', '1', '+16465550129'],
    ['a number with its plus', '+573001234567', '57', '+573001234567'],
    ['a number with its plus and no code', '+573001234567', undefined, '+573001234567'],
    ['a national number with its trunk zero', '07400123456', '44', '+447400123456'],
    ['a number that does not parse', '12345', '1', '+112345']
  ])('%s', (_name, number, code, expected) => {
    expect(phoneDialNumber(number, code)).toBe(expected)
    expect(phoneUrl(number, code)).toBe(`tel:${expected}`)
  })

  it('has no spaces, whatever the number was written with', () => {
    expect(phoneUrl('646 555 0129', '1')).not.toMatch(/\s/)
    expect(phoneUrl('646 555 0129', '1')).toBe('tel:+16465550129')
  })

  it('with no code it is the bare digits: nothing to put in front', () => {
    expect(phoneDialNumber('6465550129')).toBe('6465550129')
    expect(phoneUrl('6465550129', null)).toBe('tel:6465550129')
  })

  it('what has no digits only, or nothing, cannot be dialled: `tel:invalid`, which the app\'s links tell the driver', () => {
    expect(phoneDialNumber('call me', '1')).toBeNull()
    expect(phoneDialNumber('555-abc', '1')).toBeNull()
    expect(phoneDialNumber('', '1')).toBeNull()
    expect(phoneDialNumber(undefined, '1')).toBeNull()
    expect(phoneUrl('555-abc', '1')).toBe('tel:invalid')
    expect(phoneUrl(null, '1')).toBe('tel:invalid')
  })

  it('shows and dials the same number', () => {
    const digits = (text: string) => text.replace(/\D/g, '')
    for (const [number, code] of [['6465550129', '1'], ['3001234567', '57'], ['5512345678', '52'], ['16465550129', '1']]) {
      expect(digits(formatPhone(number, code))).toBe(digits(phoneDialNumber(number, code) as string))
    }
  })
})

describe('a number saved without its country code takes the project\'s default country', () => {
  it('"US": shown international and dialled with +1', () => {
    expect(formatPhone('2125550198', undefined, 'US')).toBe('+1 212 555 0198')
    expect(formatPhone('2125550198', '', 'us')).toBe('+1 212 555 0198')
    expect(phoneDialNumber('2125550198', null, 'US')).toBe('+12125550198')
    expect(phoneUrl('2125550198', undefined, 'US')).toBe('tel:+12125550198')
  })

  it('the default given as a calling code: "1", "+57", 57', () => {
    expect(formatPhone('2125550198', undefined, '1')).toBe('+1 212 555 0198')
    expect(formatPhone('3001234567', undefined, '+57')).toBe('+57 300 1234567')
    expect(phoneUrl('3001234567', undefined, 57)).toBe('tel:+573001234567')
    expect(phoneUrl('5512345678', undefined, 'MX')).toBe('tel:+525512345678')
  })

  it('a number that is not valid for the default country stays as it was written', () => {
    expect(formatPhone('3001234567', undefined, 'US')).toBe('3001234567')
    expect(phoneUrl('3001234567', undefined, 'US')).toBe('tel:3001234567')
    expect(formatPhone('12345', undefined, 'US')).toBe('12345')
  })

  it('a number that already begins with the default code is not given it twice', () => {
    expect(formatPhone('12125550198', undefined, 'US')).toBe('+1 212 555 0198')
    expect(phoneUrl('573001234567', undefined, '57')).toBe('tel:+573001234567')
  })

  it('a project with no default, or one that is not a country, leaves the number bare as before', () => {
    expect(formatPhone('2125550198')).toBe('2125550198')
    expect(formatPhone('2125550198', undefined, undefined)).toBe('2125550198')
    expect(formatPhone('2125550198', undefined, '')).toBe('2125550198')
    expect(formatPhone('2125550198', undefined, 'XX')).toBe('2125550198')
    expect(phoneUrl('2125550198', undefined, 'XX')).toBe('tel:2125550198')
  })

  it('a party WITH a code ignores the default', () => {
    expect(formatPhone('3001234567', '57', 'US')).toBe('+57 300 1234567')
    expect(phoneUrl('3001234567', '57', 'US')).toBe('tel:+573001234567')
    // Even when its own code makes an impossible number: the default is not tried in its place.
    expect(formatPhone('2125550198', '57', 'US')).toBe('+57 2125550198')
    expect(phoneUrl('2125550198', '57', 'US')).toBe('tel:+572125550198')
  })

  it('a number with its plus keeps its own code, whatever the default', () => {
    expect(formatPhone('+573001234567', undefined, 'US')).toBe('+57 300 1234567')
  })
})
