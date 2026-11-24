import { businessContacts, customerContacts, customerFullName, deliveryOptionName, distanceText, mapsUrl, storeToCustomerKilometers, stopContacts } from '../partyContact'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'

const theme: any = defaultAppTheme()
/** A theme built from values, as the app builds a served theme. */
const themeWith = (values: any): any => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const t = (key: string, fallback?: string) => fallback ?? key

describe('the contacts of a party, as links', () => {
  const order = {
    business: { email: 'store@x.com', cellphone: '612345678', phone: '+34912345678', country_phone_code: '34' },
    customer: { email: 'ana@x.com', cellphone: '6465550129', phone: '2125550123', country_phone_code: '1' }
  }

  it('the store: its e-mail, its cellphone and its phone, international in the text and E.164 in the link, whether or not the number has its plus', () => {
    const { email, phones } = businessContacts(theme, order, [4, 6, 7])
    expect(email).toEqual({ key: 'email', url: 'mailto:store@x.com', text: 'store@x.com' })
    expect(phones).toEqual([
      { key: 'cellphone', url: 'tel:+34612345678', text: '+34 612 34 56 78' },
      { key: 'phone', url: 'tel:+34912345678', text: '+34 912 34 56 78' }
    ])
  })

  it('the customer: international in the text and E.164 (no space) in the link, for the cellphone and for the phone', () => {
    const { email, phones } = customerContacts(theme, order)
    expect(email?.url).toBe('mailto:ana@x.com')
    expect(phones).toEqual([
      { key: 'cellphone', url: 'tel:+16465550129', text: '+1 646 555 0129' },
      { key: 'phone', url: 'tel:+12125550123', text: '+1 212 555 0123' }
    ])
  })

  it('a party without its country code shows and dials the number as it is', () => {
    expect(customerContacts(theme, { customer: { cellphone: '6465550129' } }).phones[0]).toEqual({ key: 'cellphone', url: 'tel:6465550129', text: '6465550129' })
    expect(businessContacts(theme, { business: { cellphone: '6465550129' } }).phones[0]).toEqual({ key: 'cellphone', url: 'tel:6465550129', text: '6465550129' })
  })

  it('a party saved with no country code takes the project\'s default country, in the text and in the link; a party with one ignores it', () => {
    const noCode = { business: { cellphone: '2125550198', phone: '2125550123' }, customer: { cellphone: '2125550198' } }
    expect(businessContacts(theme, noCode, undefined, 'US').phones).toEqual([
      { key: 'cellphone', url: 'tel:+12125550198', text: '+1 212 555 0198' },
      { key: 'phone', url: 'tel:+12125550123', text: '+1 212 555 0123' }
    ])
    expect(customerContacts(theme, noCode, '+1').phones[0]).toEqual({ key: 'cellphone', url: 'tel:+12125550198', text: '+1 212 555 0198' })
    expect(stopContacts(theme, noCode, 'customer', undefined, 'US').call?.url).toBe('tel:+12125550198')
    // No default: as written. The other party's code is never lent.
    expect(businessContacts(theme, { business: noCode.business, customer: { country_phone_code: '57' } }).phones[0].url).toBe('tel:2125550198')
    expect(customerContacts(theme, { customer: { cellphone: '3001234567', country_phone_code: '57' } }, 'US').phones[0].url).toBe('tel:+573001234567')
  })

  it('a number with its country code already inside is not given the code twice', () => {
    expect(customerContacts(theme, { customer: { cellphone: '16465550129', country_phone_code: '1' } }).phones[0]).toEqual(
      { key: 'cellphone', url: 'tel:+16465550129', text: '+1 646 555 0129' }
    )
  })

  it('a number that cannot be dialled (letters in it) dials `invalid`', () => {
    expect(customerContacts(theme, { customer: { cellphone: '555-abc' } }).phones[0].url).toBe('tel:invalid')
    expect(businessContacts(theme, { business: { phone: 'call me' } }).phones[0].url).toBe('tel:invalid')
  })

  it('the store has no contacts in an assignment request, and has them in any other state of a logistic order', () => {
    expect(businessContacts(theme, { ...order, isLogistic: true, status: 7 }, [4, 6, 7])).toEqual({ email: null, phones: [] })
    expect(businessContacts(theme, { ...order, isLogistic: true, status: 8 }, [4, 6, 7]).phones).toHaveLength(2)
    expect(businessContacts(theme, { ...order, status: 7 }, [4, 6, 7]).phones).toHaveLength(2)
  })

  it('the visibility keys hide each party\'s e-mail and phones', () => {
    const off = themeWith({ visibility: { 'confirmation.business.email': false, 'confirmation.customer.phone': false } })
    expect(businessContacts(off, order).email).toBeNull()
    expect(businessContacts(off, order).phones).toHaveLength(2)
    expect(customerContacts(off, order).phones).toEqual([])
    expect(customerContacts(off, order).email).not.toBeNull()
  })
})

describe('the contacts of the current stop (stopContacts)', () => {
  const order = {
    business: { email: 'store@x.com', cellphone: '612345678', phone: '+34912345678', country_phone_code: '34' },
    customer: { email: 'ana@x.com', cellphone: '6465550129', phone: '2125550123', country_phone_code: '1' }
  }

  it.each(['business', 'customer'] as const)('the %s: the first phone is the Call button\'s, the other phone and then the e-mail are links', (party) => {
    const { call, links } = stopContacts(theme, order, party)
    const all = party === 'business' ? businessContacts(theme, order) : customerContacts(theme, order)
    expect(call).toEqual(all.phones[0])
    expect(links).toEqual([all.phones[1], all.email])
    expect(links.map((link) => link.key)).toEqual(['phone', 'email'])
  })

  it('a party with one phone and no e-mail has no links', () => {
    expect(stopContacts(theme, { business: { phone: '+34912345678' } }, 'business')).toEqual({
      call: { key: 'phone', url: 'tel:+34912345678', text: '+34 912 34 56 78' },
      links: []
    })
    const customer = stopContacts(theme, { customer: { cellphone: '6465550129', country_phone_code: '1' } }, 'customer')
    expect(customer.call?.key).toBe('cellphone')
    expect(customer.links).toEqual([])
  })

  it('a party with no phone has no call and keeps its e-mail as a link', () => {
    const { call, links } = stopContacts(theme, { customer: { email: 'ana@x.com' } }, 'customer')
    expect(call).toBeUndefined()
    expect(links).toEqual([{ key: 'email', url: 'mailto:ana@x.com', text: 'ana@x.com' }])
  })

  it.each([
    ['business', 'confirmation.business.phone'],
    ['customer', 'confirmation.customer.phone']
  ] as const)('the hidden %s phone leaves no call and no phone link, only the e-mail', (party, key) => {
    const off = themeWith({ visibility: { [key]: false } })
    const { call, links } = stopContacts(off, order, party)
    expect(call).toBeUndefined()
    expect(links.map((link) => link.key)).toEqual(['email'])
  })

  it.each([
    ['business', 'confirmation.business.email'],
    ['customer', 'confirmation.customer.email']
  ] as const)('the hidden %s e-mail leaves no e-mail link, and the phones stay', (party, key) => {
    const off = themeWith({ visibility: { [key]: false } })
    const { call, links } = stopContacts(off, order, party)
    expect(call?.key).toBe('cellphone')
    expect(links.map((link) => link.key)).toEqual(['phone'])
  })

  it('the store has no contacts while the order is still an assignment request, and has them in any other state', () => {
    expect(stopContacts(theme, { ...order, isLogistic: true, status: 7 }, 'business', [4, 6, 7])).toEqual({ call: undefined, links: [] })
    expect(stopContacts(theme, { ...order, isLogistic: true, status: 8 }, 'business', [4, 6, 7]).call?.key).toBe('cellphone')
    expect(stopContacts(theme, { ...order, status: 7 }, 'business', [4, 6, 7]).call?.key).toBe('cellphone')
  })

  it('the customer is never held back by the assignment request', () => {
    expect(stopContacts(theme, { ...order, isLogistic: true, status: 7 }, 'customer', [4, 6, 7]).call?.key).toBe('cellphone')
  })

  it('the customer\'s phone has its country code in the call and in the other phone\'s link', () => {
    const { call, links } = stopContacts(theme, order, 'customer')
    expect(call).toEqual({ key: 'cellphone', url: 'tel:+16465550129', text: '+1 646 555 0129' })
    expect(links[0]).toEqual({ key: 'phone', url: 'tel:+12125550123', text: '+1 212 555 0123' })
  })
})

describe('the rest of what the details say of a party', () => {
  it('the customer\'s name is written as the details have always written it', () => {
    expect(customerFullName({ customer: { name: 'Ana', middle_name: 'M', lastname: 'Torres', second_lastname: 'Gil' } })).toBe('Ana M Torres Gil')
    expect(customerFullName({ customer: { name: 'Ana' } })).toBe('Ana')
    expect(customerFullName({})).toBe('')
  })

  it('the delivery option is for a delivery, translated by its name', () => {
    expect(deliveryOptionName({ delivery_type: 1, delivery_option: { name: 'Leave at door' } }, t)).toBe('Leave at door')
    expect(deliveryOptionName({ delivery_type: 2, delivery_option: { name: 'Leave at door' } }, t)).toBeNull()
    expect(deliveryOptionName({ delivery_type: 1 }, t)).toBeNull()
  })

  it('the maps link has the address and the location', () => {
    expect(mapsUrl('1 Main St', { lat: 1, lng: 2 })).toContain('q=1 Main St@1,2')
  })

  it('the distance between the store and the customer, in kilometers, when both have a location', () => {
    expect(storeToCustomerKilometers({ business: {}, customer: { location: { lat: 1, lng: 1 } } })).toBeNull()
    const km = storeToCustomerKilometers({ business: { location: { lat: 0, lng: 0 } }, customer: { location: { lat: 0, lng: 1 } } })
    expect(km).toBeGreaterThan(100)
    expect(km).toBeLessThan(120)
  })

  it('writes a distance in the project\'s unit', () => {
    expect(distanceText(1.609, 'mi', t)).toBe('1.00 mi')
    expect(distanceText(2, 'km', t)).toBe('2.00 km')
  })
})
