# Translation catalogs

`i18n/config.json` declares the source language, supported locales and catalog paths. `i18n/translations.json` is the multi-locale source catalog. The legacy JSON/CSV catalogs at the repository root are generated from it.

Initialize the SDK submodule before scanning; the generator scans both app and SDK source for `t('KEY', 'Fallback')` calls. The SDK files are not edited by this workflow.

```sh
yarn i18n:generate
yarn i18n:missing --summary
yarn i18n:verify
yarn i18n:check-generated
```

Add real source fallback text for newly discovered keys. Fill missing values in every supported locale in `translations.json`, preserving existing translations and interpolation placeholders. An English fallback can prevent an empty string while a translation is being prepared; it is not a translated locale value. Regenerate and commit the derived JSON/CSV files together with the catalog. The verifier checks static keys, English fallback consistency and locale completeness; dynamic runtime fallback rows are handled separately. Orphan keys remain for compatibility.

`yarn i18n:sync` only prints a dry-run summary. `yarn i18n:sync:live` writes the configured backend and requires your own translation API credentials from environment variables. See `.env.example` for names; never commit real values. The local checks and generator do not require backend credentials.
