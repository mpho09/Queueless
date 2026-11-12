# Mpho's screens

**Your Issues:** #8 Hosted Supabase + database (no screen) · **#11 F1 Search end-to-end** (this folder)
**Due:** Checkpoint 3, **Mon 16 Nov 10:00**. Search is the Must feature for the demo.
**Read first:** [the team workflow](../README.md) · Issue #11 · `docs/IMPLEMENTATION_PLAN.md` Phase 2

## 🎯 What you're building
**S2 Search Results.** The shopper types a product on S1 (e.g. "White Sugar 2kg"), lands on `/search?q=...`, and sees every matching product with **its price at each store, cheapest first**. Old prices are flagged, stock is shown, and they can add items to their basket.

| Screen | Route | Stitch boards |
|---|---|---|
| S2 Search Results | `/search?q=` | `docs/designs/queueless_s2_search_results/` · `..._desktop_1200px/` · `..._states/` |

## 📂 Files you'll create
```
client/src/screens/mpho/
├── SearchResults.jsx          the page
├── ProductResultCard.jsx      one product + its store prices
├── StorePriceRow.jsx          one store's price, stock and age
├── useSearch.js               React Query hook that calls the database
└── __tests__/
    ├── SearchResults.test.jsx
    └── priceAge.test.js

client/src/components/domain/
├── StockBadge.jsx             shared: S3 (Kabelo) uses it too
└── PriceAgeBadge.jsx          shared: S3 uses it too

client/src/utils/priceAge.js   BR1 rule (shared)
supabase/migrations/<timestamp>_search.sql
supabase/tests/search.test.sql
```

## ✅ Already built, reuse these
- `AddToBasketButton` and `CheapestPill` (`components/domain/`, from Refilwe's #16)
- `QueueBadge` for each store's queue level
- `EmptyState`, `ErrorState`, `SkeletonRows`, `OfflineBanner`
- `messages.noSearchResults` in `lib/messages.js` (the exact "No products found…" text)
- The S1 search bar already sends people to `/search?q=<text>`

## 🛠️ Step by step

### Step 1: Database search (backend)
Do #8 first; this builds on its tables.
```bash
npm run db:migration -- search
```
In the new migration file:
1. `create extension if not exists pg_trgm;` and a trigram index on `products.name`
2. A function `search_products(q text, suburb uuid default null, lim int default 10, off int default 0)` that returns each matching product with every store's price, stock and `updated_at`, **ordered by price, lowest first**, optionally filtered by suburb. Use `security invoker` so RLS still applies
3. Turn on Realtime for `listings`: `alter publication supabase_realtime add table listings;`

Test it in `supabase/tests/search.test.sql` (pgTAP), then run:
```bash
npm run db:reset
npx supabase test db
```
Check: "white sugar" finds "White Sugar 2kg", results are cheapest first, the suburb filter works, no match returns nothing.

### Step 2: The hook
`useSearch.js`: read `q` from the URL, call `supabase.rpc('search_products', { q, suburb, lim: 10, off })` with React Query's `useInfiniteQuery`, so "Load more" fetches the next 10.

### Step 3: Price age rule (BR1)
`utils/priceAge.js`: a price older than **48 hours** is "unverified". Test first:
- 47 h → no badge
- 49 h → "Unverified for 2 days"

### Step 4: The screen
1. `SearchResults.jsx`: heading with the search text, list of `ProductResultCard`s, **Load more** button
2. `ProductResultCard.jsx`: product name, then a `StorePriceRow` per store; `CheapestPill` on the lowest; `AddToBasketButton`
3. `StorePriceRow.jsx`: store name, price (`formatZAR`), `StockBadge`, `PriceAgeBadge`; tapping the store opens `/stores/:storeId`
4. States: `SkeletonRows` while loading; `EmptyState` with `messages.noSearchResults` when nothing matches; `ErrorState` on errors; cached results while offline
5. Realtime: subscribe to `listings` changes and highlight a changed price in blue

### Step 5: Connect the route
In `client/src/App.jsx`:
```jsx
import SearchResults from './screens/mpho/SearchResults.jsx'
<Route path="search" element={<SearchResults />} />
```

### Step 6: Test, compare, PR
- `SearchResults.test.jsx`: results show cheapest first; empty search shows the exact message; Load more adds results
- Compare with the S2 boards at 360px and 1200px
- PR: `feat: add Search Results screen S2 (#11)` with `Closes #11`

## 🏁 Done when
- [ ] **T-US1-1:** "White Sugar 2kg" → S2 lists matches, store prices lowest first
- [ ] **T-US1-2:** no matches → "No products found matching your search term. Please try another product name."
- [ ] BR1 tests pass (47 h / 49 h); SQL tests pass
- [ ] Load more adds 10 at a time; a price changed in Supabase updates live
- [ ] Matches Stitch at 360px and 1200px; works on the live link
- [ ] A teammate approved with a comment, and **they** merged it

## 🤝 Talk to
- **Kabelo:** he uses `StockBadge` and `PriceAgeBadge` on S3, so agree their props early
- **Joy:** the suburb filter (#19) passes the chosen suburb into your search
- **Refilwe:** `AddToBasketButton` is hers; ask before changing it
