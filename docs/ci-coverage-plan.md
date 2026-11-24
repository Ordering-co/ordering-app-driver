# CI / coverage plan — ordering-app-driver-26 (ORD-1082)

React Native app. Submodule `src/@/components` is **out of scope** (ORD-1084).

Coverage gate: `(statements + branches + functions + lines) / 4 >= 70%` on scoped Jest coverage, expanded batch-by-batch until full app-owned surface is gated.

> **Ship rule (locked):** Complete only when **all** units in [TEST_BATCH_REGISTRY.md](./TEST_BATCH_REGISTRY.md) are in `collectCoverageFrom` **and** average ≥70%. Partial include is not done.

**Blocked by:** ~~ORD-1081~~ **unblocked** (business app shipped 2026-07-14)

## Live progress

**Overall issue progress: ~88%**

| Phase | Work | Status | Coverage avg |
|-------|------|--------|--------------|
| F0/F1 | Jest harness + CI scaffold | ✅ done | n/a (scaffold) |
| S0 | Shared primitives (18 files) | ✅ done | **~78.1%** |
| U1 | App utils (`src/ui/src/utils/index.tsx`) | ✅ done | **~76.8%** (with S0) |
| P1–P3 | All 19 pages (one test file each) | ✅ done | **~78.3%** (with S0+U1) |
| D1 | Shell UI (9 wired exports) | ✅ done | **~77.9%** (with prior) |
| D2 | Auth UI (8 wired exports) | ✅ done | **~70.8%** (with prior) |
| D3 | Order filters + light UI (9 in gate) | ✅ done | **~71%** (with prior) |
| D3b | Heavy order screens (5 in gate + Delivery tests) | ✅ done | **70%** (with prior) |
| D4 | Map, logistics & messages (11/13 in gate) | ✅ done | **70.43%** (with prior) |
| D4b | Chat in gate | ✅ done | **70.02%** (with prior) |
| D4c | OrderDetails/Delivery in gate | ✅ done | **70.08%** (with prior) |
| D5 | Stores & misc (4 in gate) | ✅ done | **70.29%** (with prior) |
| Gate | 70% on full include + branch protection | partial | 86 files ✅ |
| Ship | Review → `main` + `production` | pending | — |

**Gate today:** 86 gated files — **70.29% avg** (406 tests, 87 suites). **D5:** StoresList, BusinessController, BusinessProductList, PhoneInputNumber in gate.

## Surface at ship

| Surface | Units |
|---------|-------|
| Pages | 19 |
| UI wired exports | 49 (48 `index` folders + `OrderDetails/Delivery`) |
| Shared primitives | 18 files (S0) |
| App utils | 1 (`src/ui/src/utils/index.tsx`) |
| **Total gated paths** | **87** |

## Test conventions (locked)

- **One test file per unit** — see [TEST_BATCH_REGISTRY.md](./TEST_BATCH_REGISTRY.md) § Test file convention.
- Batch IDs (P1, D3, …) are planning groups only — never `p1-auth.test.tsx`-style mega files.
- Nested siblings inside a wired-export folder (e.g. `MapView/RenderMarker.tsx`) are covered via folder globs, not separate registry rows.

## Verify locally

```bash
pnpm install
pnpm test
npx tsc --noEmit
pnpm lint:check
pnpm test:coverage:summary
```

## Canonical batch list

**Read before every test session:** [TEST_BATCH_REGISTRY.md](./TEST_BATCH_REGISTRY.md)
