'use strict'

const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')

test('i18n verify rejects a protected catalog value that drifted', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'driver-i18n-glossary-'))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))

  const i18n = path.join(root, 'i18n')
  fs.mkdirSync(i18n)
  for (const file of [
    'verify.cjs', 'scanKeys.cjs', 'loadConfig.cjs', 'isRuntimeVariable.cjs', 'translateKeysHint.cjs'
  ]) {
    fs.copyFileSync(path.join(__dirname, file), path.join(i18n, file))
  }
  fs.mkdirSync(path.join(root, 'src'))
  fs.writeFileSync(path.join(root, 'src', 'fixture.js'), "t('PICKUP', 'Pickup')\n")

  const write = (file, data) => fs.writeFileSync(path.join(i18n, file), JSON.stringify(data))
  write('config.json', {
    product: 'driver_app', prefix: 'DRIVER_APP_', sourceLanguage: 'en', supportedLocales: ['es']
  })
  write('glossary.json', { PICKUP: { es: 'Recoger' } })

  const catalog = { PICKUP: { en: 'Pickup', es: 'Recoger' } }
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const spanishDays = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
  days.forEach((en, index) => { catalog[`DAY${index + 1}`] = { en, es: spanishDays[index] } })

  const verify = () => spawnSync(process.execPath, ['i18n/verify.cjs'], {
    cwd: root, encoding: 'utf8'
  })
  write('translations.json', catalog)
  const matching = verify()
  assert.equal(matching.status, 0, matching.stderr)

  catalog.PICKUP.es = 'Levantar'
  write('translations.json', catalog)
  const drifted = verify()
  assert.equal(drifted.status, 1, drifted.stderr)
  assert.match(drifted.stderr, /glossary mismatch for PICKUP \(es\)/)
})
