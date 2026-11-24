import { linkScheme, opensWithoutAsking } from '../links'

describe('links: which are opened without asking the system', () => {
  it('reads the scheme in lowercase', () => {
    expect(linkScheme('TEL:+1646')).toBe('tel')
    expect(linkScheme('google.navigation:q=1,2')).toBe('google.navigation')
    expect(linkScheme('no scheme')).toBe('')
    expect(linkScheme(undefined as any)).toBe('')
  })

  it.each(['tel:+16465550129', 'sms:+16465550129', 'mailto:a@b.co'])('%s is the system\'s own', (url) => {
    expect(opensWithoutAsking(url)).toBe(true)
  })

  it.each(['https://maps.google.com', 'waze://?ll=1,2', 'geo:0,0?q=1', 'comgooglemaps://', '', 'https://x.co/?next=tel:123'])('%s is asked first', (url) => {
    expect(opensWithoutAsking(url)).toBe(false)
  })
})
