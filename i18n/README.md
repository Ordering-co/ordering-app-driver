# i18n — Driver App (ORD-1105 / ORD-1103)

Source of truth for UI translation keys (`useLanguage` / `t('KEY', 'fallback')`).

## Config (locales SSoT)

[`config.json`](./config.json):

```json
{
  "product": "driver_app",
  "prefix": "DRIVER_APP_",
  "sourceLanguage": "en",
  "supportedLocales": ["es", "fr", "it", "de", "pt", "da", "nl", "ar", "el", "bg", "tr"],
  "catalogPath": "i18n/translations.json",
  "legacyCatalogPath": "app-driver-translations.json"
}
```

- Catalog keys are **unprefixed**. Sync applies `DRIVER_APP_` at POST time.
- Runtime already prefixes via `app_internal_name: driver_app`.

## Commands

```bash
pnpm i18n:generate                         # scan src/ → translations.json + legacy JSON/CSV
pnpm i18n:verify                           # fail on missing keys/locales or protected term changes
pnpm i18n:missing --summary
pnpm i18n:missing --limit 40 --write i18n/batch-missing.json
pnpm i18n:apply-batch i18n/batch-filled.json --strict
pnpm i18n:sync                             # dry-run (default)
pnpm i18n:sync:live                        # live upload; CI does it on merge (see CI), by hand only with i18n/.env
```

The reviewed terms in [`glossary.json`](./glossary.json) are checked by `i18n:verify`. Update the glossary only when intentionally changing a protected term. Run its regression with `node --test i18n/verify-glossary.test.cjs`.

Fill locales with project skill [`.cursor/skills/translate-keys/SKILL.md`](../.cursor/skills/translate-keys/SKILL.md) (`/translate-keys`).

## Legacy files

`generate` still updates root:

- `app-driver-translations.json` — `{ translation: { KEY: en } }`
- `app-driver-translations.csv` — `Key,Value`

Prefer `i18n/translations.json` for multi-locale work going forward.

## CI

- **i18n Verify** in `.github/workflows/ci.yml` (required by quality gate)
- **i18n Sync** (`.github/workflows/i18n-sync.yml`):
  - Pull request touching `i18n/**`: completeness gate + dry run (no HTTP, no secret).
  - Push to `main` touching `i18n/**`: the same, then the **live sync** to the API
    (`POST /{version}/system/bulks/translations`, product `driver_app`, keys prefixed `DRIVER_APP_`).
  - Run workflow by hand (`dry-run` or `live`): live only runs from `main`.
  - The live job fails (it never skips) when a required secret is missing. It runs only in
    `Finitless-com/ordering-app-driver-theming`.

### What the live sync does

- Sends every catalog key as one item: English as the key's value plus the 11 `supportedLocales` in
  `langs`, in requests of up to 500 keys. It adds and updates; it **never deletes** (a key removed
  from the catalog stays in the API).
- It writes api-core's shared catalog (main database: `translations`, `translation_lang`). A row
  whose text is already identical is skipped. A text that differs is **overwritten** with the
  catalog's. Whoever needs a different text for one project edits it in that project's translations:
  those are stored apart (local tables), the sync never touches them, and they win when the app
  reads `GET translations?product=driver_app&version=v2`.
- The API cache of every project's translations is dropped when something changed.
- Because it overwrites the shared rows, a text must be changed in `i18n/translations.json` (a pull
  request), not directly in the API's shared catalog: the next sync would revert it.

### Settings (organization level, shared with this repository)

| Name | Kind | Value comes from |
|------|------|------------------|
| `ORDERING_API_BASE_URL` | secret | The API host the app reads from (production), without version |
| `ORDERING_TRANSLATION_SYNC_KEY` | secret | api-core's `TRANSLATION_SYNC_API_KEY` |
| `ORDERING_API_VERSION` | secret, optional | Defaults to `v400` |

An organization secret reaches selected repositories only: this repository must be among them.

## Scope

Scans `src/` including `src/@/components` submodule. Do not edit the submodule from this repo for string fixes.

For local live runs, copy [`i18n/.env.example`](./.env.example) to `i18n/.env` (gitignored). `sync.cjs` loads it automatically.
