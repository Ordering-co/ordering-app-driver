import { languageOwnName } from '../languageNames'
import config from '../../../../../i18n/config.json'

describe('languageOwnName: a language in itself', () => {
  it.each([
    ['es', 'Spanish', 'Español'],
    ['en', 'English', 'English'],
    ['pt', 'Portuguese', 'Português'],
    ['fr', 'French', 'Français'],
    ['de', 'German', 'Deutsch'],
    ['ar', 'Arabic', 'العربية'],
    ['el', 'Greek', 'Ελληνικά'],
    ['zh', 'Chinese', '中文'],
    ['ru', 'Russian', 'Русский']
  ])('%s is %s in the API and %s in itself', (code, apiName, own) => {
    expect(languageOwnName(code, apiName)).toBe(own)
  })

  it('has a name for every language of the translation catalog', () => {
    for (const code of [config.sourceLanguage, ...config.supportedLocales]) {
      expect(languageOwnName(code, 'API name')).not.toBe('API name')
    }
  })

  it('reads the code whatever its case or separator', () => {
    expect(languageOwnName('ES', 'Spanish')).toBe('Español')
    expect(languageOwnName(' es ', 'Spanish')).toBe('Español')
    expect(languageOwnName('pt_BR', 'Portuguese (Brazil)')).toBe('Português (Brasil)')
  })

  it('the Indic and Khmer languages the API sends are written in themselves', () => {
    expect(languageOwnName('km', 'Khmer')).toBe('ខ្មែរ')
    expect(languageOwnName('kn', 'Kannada')).toBe('ಕನ್ನಡ')
    expect(languageOwnName('ta', 'Tamil')).toBe('தமிழ்')
    expect(languageOwnName('bn', 'Bengali')).toBe('বাংলা')
    expect(languageOwnName('ms', 'Malay')).toBe('Bahasa Melayu')
  })

  describe('regional variants stay distinguishable', () => {
    const rows = [
      ['es', 'Spanish'],
      ['es-419-1', 'Spanish (Mexico)'],
      ['es-419-2', 'Spanish (La - Guatemala)']
    ]

    it('a code that only matches by its language is the language\'s own name plus the qualifier of the API\'s name', () => {
      expect(languageOwnName('es-419-1', 'Spanish (Mexico)')).toBe('Español (Mexico)')
      expect(languageOwnName('es-419-2', 'Spanish (La - Guatemala)')).toBe('Español (La - Guatemala)')
      expect(languageOwnName('es-MX', 'Spanish (Mexico)')).toBe('Español (Mexico)')
    })

    it('with no qualifier in the API\'s name, the API\'s name as it is', () => {
      expect(languageOwnName('es-419-3', 'Spanish')).toBe('Spanish')
      expect(languageOwnName('fr-ca', 'French Canada')).toBe('French Canada')
    })

    it('an exact code is its own name, qualifier or not', () => {
      expect(languageOwnName('es', 'Spanish')).toBe('Español')
      expect(languageOwnName('pt-br', 'Portuguese (Brazil)')).toBe('Português (Brasil)')
    })

    it('the three Spanish rows of a project read three different ways', () => {
      const names = rows.map(([code, name]) => languageOwnName(code, name))
      expect(names).toEqual(['Español', 'Español (Mexico)', 'Español (La - Guatemala)'])
      expect(new Set(names).size).toBe(rows.length)
    })
  })

  it('keeps the API\'s name for a code that is not in the table', () => {
    expect(languageOwnName('xx', 'Klingon')).toBe('Klingon')
    expect(languageOwnName('', 'Nothing')).toBe('Nothing')
    expect(languageOwnName(undefined, 'Nothing')).toBe('Nothing')
    expect(languageOwnName('xx')).toBeUndefined()
  })
})
