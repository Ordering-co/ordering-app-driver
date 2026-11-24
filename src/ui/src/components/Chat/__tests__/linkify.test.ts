import { splitLinks } from '../linkify'

const links = (text: string) => splitLinks(text).filter(part => part.type !== 'text')

describe('splitLinks', () => {
  it('leaves a plain text as it is', () => {
    expect(splitLinks('Hello there')).toEqual([{ type: 'text', text: 'Hello there' }])
    expect(splitLinks('')).toEqual([])
  })

  it('finds a web address, with its scheme or starting by www.', () => {
    expect(splitLinks('See https://ordering.co/menu?x=1#top, thanks')).toEqual([
      { type: 'text', text: 'See ' },
      { type: 'url', text: 'https://ordering.co/menu?x=1#top', href: 'https://ordering.co/menu?x=1#top' },
      { type: 'text', text: ', thanks' },
    ])
    expect(links('Go to www.ordering.co.')).toEqual([
      { type: 'url', text: 'www.ordering.co', href: 'https://www.ordering.co' },
    ])
    expect(links('(http://example.com/a_(b))')).toEqual([
      { type: 'url', text: 'http://example.com/a_(b)', href: 'http://example.com/a_(b)' },
    ])
  })

  it('finds an email', () => {
    expect(splitLinks('Write to help+orders@ordering.co!')).toEqual([
      { type: 'text', text: 'Write to ' },
      { type: 'email', text: 'help+orders@ordering.co', href: 'mailto:help+orders@ordering.co' },
      { type: 'text', text: '!' },
    ])
  })

  it.each([
    ['+52 55 1234 5678', 'tel:+525512345678'],
    ['+1 (201) 555-0123', 'tel:+12015550123'],
    ['(201) 555-0123', 'tel:2015550123'],
    ['201-555-0123', 'tel:2015550123'],
    ['5512345678', 'tel:5512345678'],
    ['+44 7400 123456', 'tel:+447400123456'],
  ])('finds the phone %s', (phone, href) => {
    expect(splitLinks(`Call ${phone}.`)).toEqual([
      { type: 'text', text: 'Call ' },
      { type: 'phone', text: phone, href },
      { type: 'text', text: '.' },
    ])
  })

  it.each([
    'Order placed for 2026-11-10 12:30:00 Via Ordering app',
    'Delivery on 10/11/2026 12:30',
    'Delivery on 10.11.2026 at 12',
    'Order #12345678 is ready',
    'It is $1234567.50 in total',
    'It is 1234567.50 in total',
    'Changed from 15 to 30 Minutes',
    'Code 1234 567',
    'ref ABC12345678',
  ])('takes no date, amount or reference for a phone: %s', (text) => {
    expect(splitLinks(text)).toEqual([{ type: 'text', text }])
  })

  it('finds every link of a message, in order', () => {
    expect(links('www.ordering.co or help@ordering.co or +52 55 1234 5678').map(part => part.type)).toEqual(['url', 'email', 'phone'])
    // The digits of an address or an email are not a phone.
    expect(links('https://ordering.co/o/5512345678 5512345678@ordering.co').map(part => part.type)).toEqual(['url', 'email'])
  })
})
