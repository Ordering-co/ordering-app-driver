#!/usr/bin/env node
/* i18n generator for ordering-app-driver-26.
 * Scans src/ (app + submodule) for t('KEY', 'fallback') and emits:
 *   - i18n/translations.json       : multi-locale catalog (SoT)
 *   - app-driver-translations.json: legacy { translation: { KEY: en } }
 *   - app-driver-translations.csv : legacy Key,Value
 *   - i18n/lang_keys.csv, conflicts, typo_findings
 */
'use strict'

const fs = require('fs')
const path = require('path')
const { scanKeys } = require('./scanKeys.cjs')
const { loadConfig } = require('./loadConfig.cjs')

const OUT = path.join(__dirname)
fs.mkdirSync(OUT, { recursive: true })

const config = loadConfig()
const { rows, keys, filesScanned, totalCalls, dynamicSkipped } = scanKeys()

const catalogPath = config.catalogPath
let existing = {}
if (fs.existsSync(catalogPath)) {
  existing = JSON.parse(fs.readFileSync(catalogPath, 'utf8'))
}

// Seed EN from legacy JSON when code has no static fallback
let legacyMap = {}
const legacyPath = config.legacyCatalogPath
  ? path.resolve(process.cwd(), config.legacyCatalogPath)
  : path.resolve(process.cwd(), 'app-driver-translations.json')
if (fs.existsSync(legacyPath)) {
  try {
    const legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'))
    legacyMap = legacy.translation && typeof legacy.translation === 'object'
      ? legacy.translation
      : legacy
  } catch (e) {
    console.warn('WARN: could not parse legacy catalog:', e.message)
  }
}

const sourceLang = config.sourceLanguage
const locales = config.supportedLocales
const catalog = {}
const scannedKeys = new Set(rows.map(r => r.key))

for (const r of rows) {
  const prev = existing[r.key] && typeof existing[r.key] === 'object' ? existing[r.key] : {}
  const entry = { ...prev }
  if (r.value) {
    entry[sourceLang] = r.value
  } else if (prev[sourceLang]) {
    entry[sourceLang] = prev[sourceLang]
  } else if (legacyMap[r.key]) {
    entry[sourceLang] = String(legacyMap[r.key])
  } else {
    entry[sourceLang] = ''
  }
  for (const loc of locales) {
    if (entry[loc] == null) entry[loc] = prev[loc] != null ? prev[loc] : ''
  }
  catalog[r.key] = entry
}

// Keep orphan keys from existing catalog + legacy (no deletes)
for (const key of Object.keys(existing)) {
  if (catalog[key]) continue
  const prev = existing[key] && typeof existing[key] === 'object' ? existing[key] : {}
  const entry = { ...prev }
  if (entry[sourceLang] == null || entry[sourceLang] === '') {
    if (legacyMap[key]) entry[sourceLang] = String(legacyMap[key])
    else entry[sourceLang] = ''
  }
  for (const loc of locales) {
    if (entry[loc] == null) entry[loc] = ''
  }
  catalog[key] = entry
}

for (const key of Object.keys(legacyMap)) {
  if (catalog[key]) continue
  if (!/^[A-Z0-9_]+$/.test(key) && !/^\d+$/.test(key)) continue
  const entry = { [sourceLang]: String(legacyMap[key] || '') }
  for (const loc of locales) entry[loc] = ''
  catalog[key] = entry
}

const sortedCatalog = {}
for (const key of Object.keys(catalog).sort((a, b) => a.localeCompare(b))) {
  sortedCatalog[key] = catalog[key]
}
fs.writeFileSync(catalogPath, JSON.stringify(sortedCatalog, null, 2) + '\n')

// Legacy JSON (EN only) — retained for compatibility
const legacyOut = { translation: {} }
for (const key of Object.keys(sortedCatalog)) {
  legacyOut.translation[key] = sortedCatalog[key][sourceLang] || ''
}
fs.writeFileSync(legacyPath, JSON.stringify(legacyOut, null, 2) + '\n')

// Legacy CSV Key,Value
const esc = s => '"' + String(s).replace(/"/g, '""') + '"'
const legacyCsv = ['Key,Value']
for (const key of Object.keys(legacyOut.translation)) {
  legacyCsv.push([esc(key), esc(legacyOut.translation[key])].join(','))
}
const legacyCsvPath = path.resolve(process.cwd(), 'app-driver-translations.csv')
fs.writeFileSync(legacyCsvPath, legacyCsv.join('\n') + '\n')

// Detailed CSV under i18n/
const csv = ['key,value,source,note']
for (const r of rows) {
  csv.push([esc(r.key), esc(r.value), esc(r.source), esc(r.note)].join(','))
}
fs.writeFileSync(path.join(OUT, 'lang_keys.csv'), csv.join('\n') + '\n')

const conf = ['key,value,app_uses,submodule_uses']
for (const [key, e] of keys) {
  if (e.values.size > 1) {
    for (const [v, c] of e.values) {
      conf.push([esc(key), esc(v), c.app, c.sub].join(','))
    }
  }
}
fs.writeFileSync(path.join(OUT, 'lang_keys_conflicts.csv'), conf.join('\n') + '\n')

const MISSPELL = [
  'recieve', 'occured', 'occurence', 'seperate', 'definately', 'adress', 'addres\\b',
  'succesful', 'successfull', 'sucessful', 'accross', 'aquire', 'avaliable', 'availabe',
  'begining', 'beleive', 'calender', 'cancelation', 'cant\\b', 'comming', 'commited',
  'completly', 'choosen', 'concious', 'definate', 'dissapear', 'dont\\b', 'embarass',
  'enviroment', 'existance', 'foward', 'goverment', 'happend', 'harrass', 'independant',
  'indispensible', 'knowlege', 'lenght', 'maintainance', 'mispell', 'neccessary',
  'necesary', 'noticable', 'occassion', 'paymet', 'persistant', 'posession', 'prefered',
  'priviledge', 'quanity', 'questionaire', 'recomend', 'refered', 'refering', 'relevent',
  'reciept', 'rythm', 'succesfully', 'tommorow', 'truely', 'untill', 'usefull', 'wich\\b',
  'withing', 'writting', 'youre\\b', 'doesnt', 'wont\\b', 'pelase', 'plase', 'agin',
  'amout', 'avilable', 'minumum', 'maxinum', 'sucess', 'erro\\b', 'porfile', 'profle',
  'shiping', 'delievery', 'deliever', 'adddress', 'cofirm', 'confrim', 'cusomter',
  'custmer', 'orderr', 'totaly', 'aplied', 'aplly', 'addrress', 'serach', 'seach\\b',
  'selct', 'invlaid', 'requried', 'reqired', 'paswword', 'emial', 'phon\\b', 'numer\\b',
  'verfiy', 'verfication', 'succesfuly', 'logisitc'
]
const reMis = new RegExp('\\b(' + MISSPELL.join('|') + ')', 'i')
const typoLines = []
const seen = new Set()
for (const [key, e] of keys) {
  for (const v of e.values.keys()) {
    const k = key + '||' + v
    if (seen.has(k)) continue
    seen.add(k)
    if (reMis.test(v)) typoLines.push(`${key}\t${v}`)
  }
}
fs.writeFileSync(
  path.join(OUT, 'typo_findings.txt'),
  (typoLines.length ? typoLines.join('\n') : '(no curated-misspelling hits)') + '\n'
)

const missingLocaleSlots = Object.keys(sortedCatalog).reduce((n, key) => {
  const entry = sortedCatalog[key] || {}
  return n + locales.filter(loc => !entry[loc] || !String(entry[loc]).trim()).length
}, 0)

console.log('files scanned:', filesScanned)
console.log('total t() calls (string key, non-dynamic):', totalCalls)
console.log('dynamic-prefix calls skipped:', dynamicSkipped)
console.log('unique keys (scanned):', keys.size)
console.log('rows in export (incl. added dynamic):', rows.length)
console.log('catalog written:', path.relative(process.cwd(), catalogPath))
console.log('legacy JSON written:', path.relative(process.cwd(), legacyPath))
console.log('legacy CSV written:', path.relative(process.cwd(), legacyCsvPath))
console.log('supportedLocales from config:', locales.join(', '))
console.log('empty locale slots remaining (fill via translate-keys skill):', missingLocaleSlots)
console.log('catalog keys total:', Object.keys(sortedCatalog).length)
console.log('orphan/legacy-only keys kept:', Object.keys(sortedCatalog).length - scannedKeys.size)
console.log(
  'source breakdown -> app:', rows.filter(r => r.source === 'app').length,
  '| submodule:', rows.filter(r => r.source === 'submodule').length,
  '| both:', rows.filter(r => r.source === 'both').length
)
console.log('conflicting keys:', [...keys.values()].filter(e => e.values.size > 1).length)
console.log('curated typo hits:', typoLines.length)
