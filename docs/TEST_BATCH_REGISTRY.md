# Test batch registry — ordering-app-driver-26 (ORD-1082)

Living inventory for incremental test + coverage work on app-owned code.

## Coverage gate — interim vs final

| Stage | What 70% means |
|-------|----------------|
| **During batches** | ≥70% average on whatever is currently in Jest `collectCoverageFrom` / coverage include. |
| **At issue completion (ship)** | ≥70% average with **all** testable units from this registry in the gate (or explicitly `skipped` with reason). |

**Ship criterion:** full inventory in gate + ≥70% on that full set. **Not acceptable:** 70% on a partial include only.

**Excluded from this issue:** `src/@/components` submodule — covered by ORD-1084.

## Counting convention

| Unit type | Rule |
|-----------|------|
| **Wired UI export** | Every folder under `src/ui/src/components/**` with `index.tsx` or `index.js` — nested layouts included. |
| **Wired UI export (no index)** | Explicit barrel export from a named file (e.g. `OrderDetails/Delivery.tsx` → `OrderDetailsDelivery` in `src/ui/index.tsx`). **One test file per export file.** |
| **Nested sibling modules** | `.tsx` files co-located with a wired export (e.g. `PreviousOrders/OrderItem.tsx`, `MapView/RenderMarker.tsx`) are **not** separate registry units — they are gated and covered via the parent folder's `collectCoverageFrom` glob (`Component/**/*.tsx`). |
| **Page** | Every screen file in `src/pages/*.tsx`. |
| **Shared primitives** | Each component file under `src/ui/src/components/shared/**` (not `styles.tsx` / pure re-export `index.tsx`). |
| **App utils** | `src/ui/src/utils/index.tsx` (canonical utils barrel used by `@ui`). |

## Test file convention (required)

**One test file per gated unit.** Batch IDs (P1, D3, S0, …) are **planning groups only** — not file names.

| Unit type | Test path |
|-----------|-----------|
| Page `src/pages/Login.tsx` | `src/pages/__tests__/Login.test.tsx` |
| UI `src/ui/src/components/LoginForm/` | `src/ui/src/components/LoginForm/__tests__/LoginForm.test.tsx` |
| Nested UI `LoginForm/Otp/` | `src/ui/src/components/LoginForm/Otp/__tests__/Otp.test.tsx` |
| Non-index export `OrderDetails/Delivery.tsx` | `src/ui/src/components/OrderDetails/__tests__/Delivery.test.tsx` |
| Shared `shared/OButton.tsx` | `src/ui/src/components/shared/__tests__/OButton.test.tsx` |
| Utils `src/ui/src/utils/index.tsx` | `src/ui/src/utils/__tests__/index.test.tsx` |

**Do not** combine multiple pages or components in one file (e.g. `p1-auth.test.tsx`, `d1-shell.test.tsx`, `shared.test.tsx`). Shared mocks belong in `jest/helpers/`, not mega batch files.

Each file may contain multiple `test()` / `it()` cases for one unit — that is fine. **Never** put two unrelated pages or two unrelated UI exports in the same test file.

## Jest helpers (`jest/helpers/`)

Reuse patterns from **ordering-app-business-v26** (ORD-1081) where `shared/` and `OrdersOption*` overlap:

| File (copy/adapt from business) | Role |
|---------------------------------|------|
| `mockOrdering.js` | Base `@components` mock |
| `mockUi.js` | Full `@ui` stub barrel for **page** tests |
| `renderWithProviders.tsx` | Theme + SafeArea wrapper for **component** tests |
| `renderPage.tsx` | Page harness with navigation mock |

Per-batch `*Defaults.js`, `*ComponentsMock.js`, `*UiMock.js` files grow with D2–D5 (chain inheritance like business B2–B7).

## Rules per batch (every session)

1. Pick the **next pending batch** below.
2. Add **one test file per unit** (see convention above).
3. Expand Jest `collectCoverageFrom` for every new path in the batch (use folder globs for nested siblings).
4. Run verify commands — gate must stay ≥70%.
5. Mark batch `done` here + update `docs/ci-coverage-plan.md`.
6. Stop after one batch unless explicitly asked.

## Inventory at ship

| Surface | Units | Batches |
|---------|-------|---------|
| Foundation harness | scaffold | F0, F1 |
| Shared primitives | 18 files | S0 |
| App utils | 1 (`src/ui/src/utils/index.tsx`) | U1 |
| Pages (`src/pages`) | 19 | P1, P2, P3 |
| UI wired exports | 49 (48 `index` folders + `OrderDetails/Delivery`) | D1, D2, D3, D4, D5 |
| **Total gated units** | **87** | **13 batches** |

**Expected `collectCoverageFrom` paths at ship:** 87 (19 pages + 49 UI paths + 18 shared files + 1 utils). Nested siblings inside wired-export folders add coverage via folder globs but do not add separate registry rows.

**Gate today:** 86 gated files — **70.29% avg**, **87 suites / 406 tests**. **D5:** StoresList, BusinessController, BusinessProductList, PhoneInputNumber in gate.

---

## Shared primitives batch

### S0 — `src/ui/src/components/shared/**`

| Unit | Status |
|------|--------|
| `shared/OButton.tsx` | done |
| `shared/OModal.tsx` | done |
| `shared/OToast.tsx` | done |
| `shared/OInput.tsx` | done |
| `shared/OAlert.tsx` | done |
| `shared/OAlertOriginal.tsx` | done |
| `shared/OText.tsx` | done |
| `shared/ODropDown.tsx` | done |
| `shared/ODropDownCalendar.tsx` | done |
| `shared/OBottomPopup.tsx` | done |
| `shared/OIcon.tsx` | done |
| `shared/OIconButton.tsx` | done |
| `shared/OTextarea.tsx` | done |
| `shared/OFab.tsx` | done |
| `shared/OLink.tsx` | done |
| `shared/ONavbar.tsx` | done |
| `shared/OSegment.tsx` | done |
| `shared/OChatBubble.tsx` | done |
| `shared/index.tsx` | skipped (re-exports only) |

Skeleton helpers (`OrderListSkeleton`, `SkeletonBone`, etc.) are covered when parent list components are tested — not separate registry units.

Driver app shares `shared/` and `OrdersOption*` pattern with business app — reuse test helpers where possible.

---

## Foundation

### F0 — Prerequisite (before F1)

| Work item | Status |
|-----------|--------|
| Add missing `jest/setup.js` (copy from marketplace or business app) | done |

### F1 — Jest harness + CI scaffold

| Work item | Status |
|-----------|--------|
| Jest + RN preset + Testing Library RN | done |
| `jest/setup.js` + `jest/helpers/renderWithProviders.tsx` + `renderPage.tsx` | done |
| `jest/coverage-include.js` + coverage scripts | done |
| `.github/workflows/ci.yml` (one `CI Quality Gate` job: lint + typecheck + i18n + `test:coverage` + 70% gate) | done |

---

### U1 — App utils

| Unit | Status |
|------|--------|
| `src/ui/src/utils/index.tsx` | done |

> **Note:** `src/utils/index.tsx` (app-level duplicate used by `src/providers/StoreUtil.tsx`) is legacy/subset — **not** gated separately; canonical utils live under `src/ui/src/utils/`.

---

## Page batches

One test file per page. Each page test must mock the `@ui` components that page composes (via `jest/helpers/mockUi.js`), not bundle multiple pages.

### P1 — Auth & splash

| Unit | Status |
|------|--------|
| `src/pages/Splash.tsx` | done |
| `src/pages/IntroductoryTutorial.tsx` | done |
| `src/pages/Login.tsx` | done |
| `src/pages/Signup.tsx` | done |
| `src/pages/ForgotPassword.tsx` | done |
| `src/pages/Sessions.tsx` | done |
| `src/pages/NetworkError.tsx` | done |
| `src/pages/NotFound.tsx` | done |

### P2 — Orders & map

| Unit | Status |
|------|--------|
| `src/pages/Home.tsx` | done |
| `src/pages/MyOrders.tsx` | done |
| `src/pages/AcceptOrRejectOrder.tsx` | done |
| `src/pages/OrderDetails.tsx` | done |
| `src/pages/OrderDetailsLogistic.tsx` | done |
| `src/pages/OrderMessage.tsx` | done |
| `src/pages/Messages.tsx` | done |
| `src/pages/MapView.tsx` | done |

### P3 — Permissions & schedule

| Unit | Status |
|------|--------|
| `src/pages/RequestPermissions.tsx` | done |
| `src/pages/ScheduleBlocked.tsx` | done |
| `src/pages/Profile.tsx` | done |

---

## UI component batches

One test file per wired export folder (or per non-index export file). `collectCoverageFrom` uses folder globs so nested siblings are included.

### D1 — Shell

| Unit | Status |
|------|--------|
| `src/ui/src/components/shared` | done (S0) |
| `src/ui/src/components/Home` | done |
| `src/ui/src/components/LanguageSelector` | done |
| `src/ui/src/components/LogoutButton` | done |
| `src/ui/src/components/FloatingButton` | done |
| `src/ui/src/components/NetworkError` | done |
| `src/ui/src/components/NotFoundSource` | done |
| `src/ui/src/components/WebsocketStatus` | done |
| `src/ui/src/components/NotificationSetting` | done |
| `src/ui/src/components/SearchBar` | done |

### D2 — Auth

| Unit | Status |
|------|--------|
| `src/ui/src/components/LoginForm` | done |
| `src/ui/src/components/LoginForm/Otp` | done |
| `src/ui/src/components/ForgotPasswordForm` | done |
| `src/ui/src/components/SignupForm` | done |
| `src/ui/src/components/VerifyPhone` | done |
| `src/ui/src/components/Sessions` | done |
| `src/ui/src/components/UserFormDetails` | done |
| `src/ui/src/components/UserProfileForm` | done |

### D3 — Orders (filters + light)

| Unit | Status |
|------|--------|
| `src/ui/src/components/OrdersOptionBusiness` | done |
| `src/ui/src/components/OrdersOptionCity` | done |
| `src/ui/src/components/OrdersOptionDate` | done |
| `src/ui/src/components/OrdersOptionDelivery` | done |
| `src/ui/src/components/OrdersOptionDriver` | done |
| `src/ui/src/components/OrdersOptionPaymethod` | done |
| `src/ui/src/components/OrdersOptionStatus` | done |
| `src/ui/src/components/NewOrderNotification` | done |
| `src/ui/src/components/ProductItemAccordion` | done |

### D3b — Orders (heavy screens)

| Unit | Status |
|------|--------|
| `src/ui/src/components/OrdersListManager` | done (in gate) |
| `src/ui/src/components/OrdersOption` | done (in gate) |
| `src/ui/src/components/PreviousOrders` | done (in gate) |
| `src/ui/src/components/AcceptOrRejectOrder` | done (in gate) |
| `src/ui/src/components/OrderSummary` | done (in gate) |
| `src/ui/src/components/OrderDetails/Delivery.tsx` | tests done — gate deferred to D4 |

> **OrderDetails/Delivery** is the driver core screen (`OrderDetailsDelivery` export). No `index.tsx` in that folder — gated as an explicit export file. Sibling modules (`OrderDetailsInformation`, `OrderHeaderComponent`, `OrderContentComponent`, `ValidationIssuesList`, `usePrinterCommands`) are covered via `OrderDetails/**/*.tsx` glob in `collectCoverageFrom`. Deferred from D3b gate because adding it dropped avg to ~64% (branch coverage ~35%).

### D4 — Map, logistics & messages

| Unit | Status |
|------|--------|
| `src/ui/src/components/ScheduleBlocked` | ✅ in gate |
| `src/ui/src/components/DriverSchedule` | ✅ in gate |
| `src/ui/src/components/Contacts` | ✅ in gate |
| `src/ui/src/components/PreviousMessages` | ✅ in gate |
| `src/ui/src/components/MessagesOption` | ✅ in gate |
| `src/ui/src/components/ReviewCustomer` | ✅ in gate |
| `src/ui/src/components/OrderMessage` | ✅ in gate |
| `src/ui/src/components/OrderDetailsLogistic` | ✅ in gate |
| `src/ui/src/components/MapView` | ✅ in gate |
| `src/ui/src/components/GoogleMap` | ✅ in gate |
| `src/ui/src/components/DriverMap` | ✅ in gate |
| `src/ui/src/components/Chat` | ✅ in gate |
| `src/ui/src/components/OrderDetails/Delivery.tsx` | done — gated in D4c |

### D4c — Delivery gate (done)

| Unit | Status |
|------|--------|
| `src/ui/src/components/OrderDetails/Delivery.tsx` | done — 26 tests, ~71% stmts / ~66% branches isolated |

### D5 — Stores & misc (done)

| Unit | Status |
|------|--------|
| `src/ui/src/components/StoresList` | ✅ in gate |
| `src/ui/src/components/BusinessController` | ✅ in gate |
| `src/ui/src/components/BusinessProductList` | ✅ in gate |
| `src/ui/src/components/PhoneInputNumber` | ✅ in gate |

---

## Completion checklist

- [x] F0 + F1 harness green
- [x] S0 shared primitives tested (18 files, one test file each)
- [x] U1 utils done
- [x] P1 auth & splash pages done (8 pages, one test file each)
- [x] P3 page batch done (3 pages, one test file each)
- [x] All 19 pages tested (P1 + P2 + P3)
- [x] D1 shell UI done (9 wired exports, one test file each)
- [x] D2 auth UI done (8 wired exports, one test file each)
- [x] D3 filters + light UI done (9 wired exports in gate)
- [x] D3b heavy order screens in gate (5/6 in gate; Delivery → D4)
- [x] D4 map/logistics/messages in gate (11/11)
- [x] D4b Chat in gate
- [x] D4c Delivery in gate
- [x] D5 UI batch done
- [ ] `collectCoverageFrom` = full inventory (87 paths)
- [ ] `pnpm test:coverage` ≥70% on full include
- [ ] CI Quality Gate green on `main` + `production`

## Verify locally

```bash
pnpm install
pnpm test
npx tsc --noEmit
pnpm lint
pnpm test:coverage
```
