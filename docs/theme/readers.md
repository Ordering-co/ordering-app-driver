# Schema keys and their readers

`scripts/theme/keys.mjs` (`pnpm theme:keys`, in CI) looks for a reader of every key of
`product.schema.json` by matching its path as text. The keys below are read through a
variable or as a whole look, so the search does not see them; each is recorded with its
reader in [`theme-readers.json`](../../theme-readers.json) (9 records on 2026-11-23; the table below lists the ones this page describes), and the
check fails on any other key without a reader.

| Key | Read in (`src/ui/src/components/…`) |
|---|---|
| `button.colors.<color>.{on,ink,subtle}` | The engine builds button.variants.<color>.<appearance> from these tones (the component's matrix); shared/OButton.tsx reads the variants |
| `input.base.icon_color` | shared/OInput.tsx (base.icon_color), PhoneInputNumber/index.tsx and LoginForm/index.tsx (the icon inside a field) |
| `input.variants.default.states.{focus,error}.border` | shared/OInput.tsx, shared/OTextarea.tsx, shared/OSelect.tsx and shared/OOtpInput.tsx paint each state as a whole look (nativeBoxStyle(states.focus)) and reserve the widest border of the states (reservedBorder) |
| `radio.base.size`, `radio.base.unchecked` | shared/ChoiceMark.tsx (radio.base.size, radio.base.unchecked) |
| `choice.variants.default.states.selected.border` | shared/ChoiceRow.tsx reserves the widest border of its states (reservedBorder) and paints the selected one |
| `stepper.base.button_appearance` | shared/OStepper.tsx (the appearance of its two buttons) |
| `chip.variants.default.states.*` | shared/FilterChip.tsx paints the pressed and selected states as whole looks (nativeBoxStyle, reservedBorder) |
| `alert.variants.<variant>.icon_color` | shared/ONotice.tsx (look.icon_color) |
| `list_row.base.icon_color` | shared/OListRow.tsx (row.icon_color) |

`switch.base.thumb` was recorded here until round 12: the app's own `OSwitch` reads its keys as `components.switch.base…`, so the text search finds the reader and the record was removed from `theme-readers.json`.

When a key is added: give it a reader the search can see (the key's path in the code, as
`themePart(theme, 'component', 'base.key')` or `components.component.base.key`), or add
its record here and in `theme-readers.json` in the same pull request.
