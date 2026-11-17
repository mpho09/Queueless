# Queueless: Test plan

Every test from `docs/IMPLEMENTATION_PLAN.md` §13, with who owns it and where it stands. Kept by Elias (QA).
Update the **Status** column in the PR that adds or finishes a test.

**Status key:** ✅ automated test exists and passes · 🟡 test written but not run yet (open PR) · 🖐 manual, run before the final demo · ⏳ feature not built yet

## How to run the checks

Run these from the repo root. CI (`.github/workflows/ci.yml`, job `check`) runs the same steps on every PR.

| Command | What it does |
|---|---|
| `npm run lint` | ESLint on the client, server and `api/` |
| `npm run typecheck` | TypeScript checks the JavaScript (`tsconfig.json`, `strict: false`) |
| `npm test` | Client tests (Jest) then server tests (`node --test`) |
| `npm run build` | Vite build of the client into `client/dist` |
| `npm run db:test` | Database tests (pgTAP) against the hosted Supabase. Tech Lead only, needs the migration applied |

## Tests

| ID | What it checks | Manual or automated | Owner issue | Status |
|---|---|---|---|---|
| T-US1-1 | Search "White Sugar 2kg" → S2 ordered lowest price first | Manual | #11 | 🖐 |
| T-US1-2 | No matches → exact "No products found…" message | Manual + component test (`SearchResults.test.jsx`) | #11 | ✅ |
| T-US2-1 | Add 3 items → badge increments → S4 totals correct | Manual + automated (`basketTotals.test.js`, `Basket.test.jsx`) | #16 | ✅ |
| T-US2-2 | Offline add → "Action failed…" overlay | Manual (message covered by `AddToBasketButton.test.jsx`) | #16 | 🖐 |
| T-US3-1 | Submit "Long Line" → toast and updated panel | Manual | #18, #12 | 🟡 screen in PR #35; the updated panel needs S3 (#12) |
| T-US3-2 | 6th queue report in 60 min → BR2 message | Manual + automated (SQL, `supabase/tests/reports.test.sql`) | #18 | 🟡 SQL not run yet |
| BR1 | 47 h → no badge; 49 h → badge | Automated (`priceAge.test.js`) | #11 | ✅ |
| BR2 | 5 queue OK / 6th blocked; 3 price OK / 4th blocked; window rolls after 60 min | Automated (SQL) | #18 | 🟡 SQL not run yet. The "window rolls" case is not covered yet |
| BR3 | Missing item store excluded from "Cheapest"; sums only available items; saving R4.00 | Automated (`basketTotals.test.js`) | #16 | ✅ |
| BR4 | Weights: 0 min = 0.8, 15 min = 0.8, 67.5 min = 0.4, 120 min = 0; no reports → Unknown | Automated (Jest + SQL) | #12 | ⏳ no decay code or view yet |
| Validation: price | `34.99` valid; `34.999`, `-1`, `abc` invalid | Automated (`validation.test.js`) | #18 | 🟡 in PR #35 |
| Validation: password | ≥ 8 characters, 1 uppercase, 1 number | Automated (Jest) | #14 | ⏳ |
| Format | `R1,234.50`, `12 Mar 2026`, `14:05` SAST | Automated (`format.test.js`) | #9 | ✅ |
| Auth | Lockout after 5; reset link 1 h; unverified cannot write | Manual | #14 | ⏳ |
| Edge cases (PRD §6.2) | Missing price, location mismatch, live price update, session expiry mid-edit | Manual | #12, #18 | 🖐 location mismatch is covered by a screen test in PR #35 |
| Quality (PRD §12.1) | Speed, offline, devices, locale, accessibility | Manual (Phase 8) | #10 | 🖐 |

Other automated tests that exist today and are not in §13: S1 Home (`Home.test.jsx`), the suburb selector, the Savings screen and its API, search API and hooks, the offline banner, the queue badge, and `GET /api/me/savings`.

## What the checks do not cover yet

These are known gaps, not hidden failures.

- **Lint warnings (4).** Two newer React rules are set to *warning* so the existing code passes: `react-hooks/purity` (`Date.now()` during render in `Basket.jsx` and `Home.jsx`) and `react-hooks/set-state-in-effect` (`SearchResults.jsx`). Each owner can fix their file, then the rules can go back to *error* in `eslint.config.mjs`. There is also one fast-refresh warning in `QueueBadge.jsx`.
- **Typecheck covers about half the client.** TypeScript reports 47 errors in 15 files. Most say a component prop "is missing" because TypeScript assumes every prop of a plain-JavaScript component is required. To avoid editing teammates' code, `tsconfig.json` only lists files that are clean and whose imports are clean. The server, `api/` and 42 client files are checked.
  Not checked yet: `components/ui/Button.jsx`, `Card.jsx`, `components/feedback/ErrorState.jsx`, `components/domain/AddToBasketButton.jsx`, `lib/api.js`, `lib/data.js`, `pages/Basket.jsx`, `pages/Home.jsx`, `utils/basketTotals.js` (and its test), `screens/joy/SuburbSelector.jsx`, `screens/mpho/SearchResults.jsx`, `screens/mpho/StorePriceRow.jsx`, `screens/refilwe/Dialog.jsx`, `screens/refilwe/Savings.jsx`, and every file that imports one of them.
  When an owner fixes a file, add it (and the files that import it) to `include` in `tsconfig.json`. Check by running `npm run typecheck`.
- **Database tests are not in CI.** They need Docker (`supabase start`) or access to the hosted project. The optional CI job is a follow-up with Mpho.
