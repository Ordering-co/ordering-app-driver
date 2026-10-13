#!/usr/bin/env node
/* CI helper: fail if i18n:generate would change committed catalog artifacts.
 * Ensures developers (or pre-commit) refreshed English/keys from code.
 *
 * Compares generate output to the pre-generate working tree (not HEAD), so
 * uncommitted locale fills are never wiped by a failing check.
 */
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { execSync } = require('child_process')

const watched = [
  'i18n/translations.json',
  'i18n/lang_keys.csv',
  'i18n/lang_keys_conflicts.csv',
  'i18n/typo_findings.txt'
]

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-check-'))
const backups = []

for (const file of watched) {
  if (!fs.existsSync(file)) continue
  const dest = path.join(tmpDir, file.replace(/\//g, '__'))
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(file, dest)
  backups.push({ file, dest })
}

console.log('i18n:check-generated → running generate, then comparing to pre-generate tree')
try {
  execSync('node i18n/generate.cjs', { stdio: 'inherit' })
} catch (err) {
  // restore backups then rethrow
  for (const { file, dest } of backups) fs.copyFileSync(dest, file)
  fs.rmSync(tmpDir, { recursive: true, force: true })
  throw err
}

let changed = false
const changedFiles = []
for (const { file, dest } of backups) {
  const before = fs.readFileSync(dest)
  const after = fs.existsSync(file) ? fs.readFileSync(file) : Buffer.alloc(0)
  if (!before.equals(after)) {
    changed = true
    changedFiles.push(file)
  }
}

// Also fail if generate created a watched file that did not exist before
for (const file of watched) {
  if (fs.existsSync(file) && !backups.find(b => b.file === file)) {
    changed = true
    changedFiles.push(file)
  }
}

if (changed) {
  console.error('FAIL: i18n catalog is out of date with code.')
  console.error('Run: pnpm i18n:generate  (or commit via husky pre-commit)')
  console.error('Then fill locales with /translate-keys and re-commit.')
  console.error('Changed:', changedFiles.join(', '))
  // restore pre-generate working tree (preserves locale fills)
  for (const { file, dest } of backups) fs.copyFileSync(dest, file)
  fs.rmSync(tmpDir, { recursive: true, force: true })
  process.exit(1)
}

fs.rmSync(tmpDir, { recursive: true, force: true })
console.log('OK: i18n catalog matches code scan')
process.exit(0)
