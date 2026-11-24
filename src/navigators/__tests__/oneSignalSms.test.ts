import { oneSignalSmsNumber } from '../oneSignalSms'

describe('oneSignalSmsNumber', () => {
  it('joins the country code and the number without spaces (E.164)', () => {
    expect(oneSignalSmsNumber({ country_phone_code: 57, cellphone: '3008282222' })).toBe('+573008282222')
    expect(oneSignalSmsNumber({ country_phone_code: '+1', cellphone: '(555) 123-4567' })).toBe('+15551234567')
  })

  it('drops the national trunk zero', () => {
    expect(oneSignalSmsNumber({ country_phone_code: '44', cellphone: '07700 900123' })).toBe('+447700900123')
  })

  it('keeps a number that already carries its country code', () => {
    expect(oneSignalSmsNumber({ country_phone_code: '57', cellphone: '+57 300 828 2222' })).toBe('+573008282222')
    expect(oneSignalSmsNumber({ cellphone: '+1 555 123 4567' })).toBe('+15551234567')
  })

  it('gives nothing when no valid number can be built', () => {
    expect(oneSignalSmsNumber({ cellphone: '3008282222' })).toBe('')
    expect(oneSignalSmsNumber({ country_phone_code: '57', cellphone: '' })).toBe('')
    expect(oneSignalSmsNumber({ country_phone_code: '57', cellphone: '12' })).toBe('')
    expect(oneSignalSmsNumber({ country_phone_code: '57', cellphone: '1234567890123456' })).toBe('')
    expect(oneSignalSmsNumber(null)).toBe('')
  })
})
