import { projectCountryOf, resolveDefaultCalling } from '../calling'

describe('the project\'s country (default_country_code)', () => {
  it.each([
    ['US', 'US'], ['ca', 'CA'], [' ca ', 'CA'], ['PK', 'PK'],
    ['+1', 'US'], ['+52', 'MX'], ['52', 'MX'], [' +52 ', 'MX'],
    ['XX', null], ['', null], [null, null], [undefined, null], ['+999999', null]
  ])('%j is %j', (value, expected) => {
    expect(projectCountryOf(value)).toBe(expected)
  })
})

describe('the phone field\'s default from the project\'s country', () => {
  it.each([
    ['+1', 'US', '1'],
    ['+52', 'MX', '52'],
    ['52', 'MX', '52'],
    [' ca ', 'CA', '1'],
    ['XX', 'US', '1'],
    ['PK', 'PK', '92']
  ])('configuration %j opens on %s +%s', (configCountry, countryCode, code) => {
    expect(resolveDefaultCalling({ configCountry })).toEqual({ countryCode, code })
  })

  it('never leaves a calling code where the flag expects an ISO country', () => {
    expect(resolveDefaultCalling({ configCountry: '+52' }).countryCode).not.toMatch(/\d/)
  })

  it('uses the project country for a code the picker does not know', () => {
    expect(resolveDefaultCalling({ defaultCode: '999999', configCountry: '+52' }).countryCode).toBe('MX')
  })
})
