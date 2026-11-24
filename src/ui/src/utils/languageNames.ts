/**
 * A language's name in that language ("Español", "English", "Português"), for the language selector: the sheet of languages and
 * the current one, on the welcome screen and in the profile. A language's own name is never translated (it is how a speaker finds
 * it in a list written in a language they cannot read), so it is not a catalog key: it is this table, by the language's code.
 *
 * It holds the languages of the app's catalog (`i18n/config.json`: `en` and `supportedLocales`) and the common ones the API may
 * return. A code that is not here keeps the name the API gave.
 */
const OWN_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  de: 'Deutsch',
  pt: 'Português',
  da: 'Dansk',
  nl: 'Nederlands',
  ar: 'العربية',
  el: 'Ελληνικά',
  bg: 'Български',
  tr: 'Türkçe',
  // The common ones the API may return.
  ru: 'Русский',
  uk: 'Українська',
  pl: 'Polski',
  cs: 'Čeština',
  sk: 'Slovenčina',
  sl: 'Slovenščina',
  hr: 'Hrvatski',
  sr: 'Srpski',
  ro: 'Română',
  hu: 'Magyar',
  sv: 'Svenska',
  no: 'Norsk',
  nb: 'Norsk bokmål',
  fi: 'Suomi',
  et: 'Eesti',
  lv: 'Latviešu',
  lt: 'Lietuvių',
  ca: 'Català',
  he: 'עברית',
  fa: 'فارسی',
  hi: 'हिन्दी',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  vi: 'Tiếng Việt',
  th: 'ไทย',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
  km: 'ខ្មែរ',
  kn: 'ಕನ್ನಡ',
  ta: 'தமிழ்',
  bn: 'বাংলা',
  te: 'తెలుగు',
  ml: 'മലയാളം',
  mr: 'मराठी',
  gu: 'ગુજરાતી',
  pa: 'ਪੰਜਾਬੀ',
  ur: 'اردو',
  ne: 'नेपाली',
  si: 'සිංහල',
  my: 'မြန်မာ',
  lo: 'ລາວ',
  tl: 'Tagalog',
  fil: 'Filipino',
  sw: 'Kiswahili',
  af: 'Afrikaans',
  sq: 'Shqip',
  bs: 'Bosanski',
  mk: 'Македонски',
  be: 'Беларуская',
  mt: 'Malti',
  is: 'Íslenska',
  ga: 'Gaeilge',
  cy: 'Cymraeg',
  eu: 'Euskara',
  gl: 'Galego',
  hy: 'Հայերեն',
  ka: 'ქართული',
  az: 'Azərbaycan',
  kk: 'Қазақша',
  uz: 'Oʻzbek',
  mn: 'Монгол',
  'zh-cn': '简体中文',
  'zh-tw': '繁體中文',
  'pt-br': 'Português (Brasil)',
  'pt-pt': 'Português (Portugal)'
}

/** The code as the table keys it: lowercase, with a dash (`pt_BR` and `PT-br` are `pt-br`). */
const keyOf = (code: unknown): string => String(code ?? '').trim().toLowerCase().replace(/_/g, '-')

/** What the API's name says in parentheses ("Spanish (Mexico)" → "Mexico"), '' when it says nothing. */
const qualifierOf = (apiName?: string): string => /\(([^)]+)\)/.exec(String(apiName ?? ''))?.[1].trim() ?? ''

/**
 * The language's own name for its code, so that two rows of the list never read the same unless the API sends the same name:
 * - a code the table has, exactly (`es`, `pt-br`): its own name ("Español", "Português (Brasil)");
 * - a regional code that only matches by its language (`es-419-1`, "Spanish (Mexico)"): the language's own name followed by the
 *   qualifier the API's name carries in parentheses ("Español (Mexico)"); the API's name as it is when it carries none (a variant we
 *   cannot tell from its base is not renamed to it);
 * - a code that is not in the table: the API's `fallbackName`.
 */
export const languageOwnName = (code: unknown, fallbackName?: string): string | undefined => {
  const key = keyOf(code)
  if (OWN_NAMES[key]) return OWN_NAMES[key]
  const base = OWN_NAMES[key.split('-')[0]]
  if (!base) return fallbackName
  const qualifier = qualifierOf(fallbackName)
  return qualifier ? `${base} (${qualifier})` : fallbackName
}
