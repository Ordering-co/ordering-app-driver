import { getCountries, getCountryCallingCode, CountryCode } from 'libphonenumber-js/max'
import { COUNTRIES } from '../countries'

describe('COUNTRIES (the phone field\'s country sheet)', () => {
  it('has each ISO code once, sorted by name', () => {
    const codes = COUNTRIES.map(country => country.cca2)
    expect(new Set(codes).size).toBe(codes.length)
    expect(codes.every(code => /^[A-Z]{2}$/.test(code))).toBe(true)
    const names = COUNTRIES.map(country => country.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })

  it('has calling codes made of digits (as the library had them: Vatican City is 3906698)', () => {
    for (const country of COUNTRIES) {
      expect(country.callingCode.every(code => /^\d{1,7}$/.test(code))).toBe(true)
    }
  })

  it('keeps what the field relies on: Puerto Rico\'s two codes, the Caribbean four digits, Colombia', () => {
    const find = (iso: string) => COUNTRIES.find(country => country.cca2 === iso)
    expect(find('PR')?.callingCode).toEqual(['1787', '1939'])
    expect(find('US')?.callingCode).toEqual(['1'])
    expect(find('CO')).toEqual({ cca2: 'CO', name: 'Colombia', callingCode: ['57'] })
    expect(find('JM')?.callingCode).toEqual(['1876'])
  })

  it('agrees with libphonenumber-js on every country that has both', () => {
    const known = new Set<string>(getCountries())
    for (const country of COUNTRIES.filter(c => known.has(c.cca2) && c.callingCode.length > 0)) {
      const code = getCountryCallingCode(country.cca2 as CountryCode)
      // A country's code is the library's, or that code followed by its area code (1 + 876).
      expect(country.callingCode.some(own => own === code || own.startsWith(code))).toBe(true)
    }
  })
})
