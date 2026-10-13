'use strict'

/** Print local catalog maintenance commands when locales are incomplete. */
function printTranslateKeysHint (stream = console.error) {
  stream('')
  stream('INFO: Translation locales are incomplete.')
  stream('Fill missing locale values in i18n/translations.json, then run:')
  stream('  yarn i18n:generate')
  stream('  yarn i18n:verify')
  stream('  yarn i18n:missing --summary')
  stream('See i18n/README.md for catalog maintenance.')
}

module.exports = { printTranslateKeysHint }
