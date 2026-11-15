# Elias's screens

**Your Issues:** #15 Deploy to Vercel (do first) · #10 Real CI (no screens) · **#18 F3 Reports end-to-end** (this folder)
**Due:** #15 and #10 by Checkpoint 3, **Mon 16 Nov 10:00** · #18 by Final, **Fri 20 Nov 10:00**
**Read first:** [the team workflow](../README.md) · Issue #18 · `docs/IMPLEMENTATION_PLAN.md` §6 and Phase 5

## 🎯 What you're building
**S5 Report Submission.** A shopper at a store reports how long the queue is, or a new price or stock level, so other shoppers know before they go. The database stops spam (limits per hour) and rewards reports that other people confirm.

| Screen | Route | Stitch boards |
|---|---|---|
| S5 Report Submission | `/stores/:storeId/report` | `docs/designs/queueless_s5_report_submission/` · `..._desktop_1200px/` · `..._states/` |

People reach it from the **"Report Queue Status"** button on Kabelo's S3 Store Details.

## 📂 Files you'll create
```
client/src/screens/elias/
├── ReportSubmission.jsx       the page, with Queue / Price / Stock tabs
├── QueueTile.jsx              one of the 4 queue options
├── useSubmitReport.js         sends the report to Supabase
└── __tests__/ReportSubmission.test.jsx

client/src/utils/validation.js            ADD price rules (Kabelo adds password rules to this file)
client/src/utils/distance.js              km between the shopper and the store

supabase/migrations/<timestamp>_report_triggers.sql
supabase/tests/reports.test.sql
```

## ✅ Already built, reuse these
- `Button`, `Card`, `Toast`, `ErrorState`, `OfflineBanner`
- `QueueBadge` labels: "No Queue", "Short Line (under 10 Mins Wait)", "Moderate Line (10–30 Mins Wait)", "Long Line (30+ Mins Wait)". Use the **same text** on your tiles
- Every message you need is already in `lib/messages.js`: `queueLimit`, `priceLimit`, `invalidPrice`, `locationMismatch`, `forbidden`

## 🛠️ Step by step

### Step 1: Database rules (backend, do this first)
```bash
npm run db:migration -- report_triggers
```
1. **BR2 limits** (`before insert` trigger on `report_logs`): per user, per store, in the last 60 minutes, max **5 queue reports** and max **3 price updates**. Over the limit → raise an error the app can show
2. **D4 verification** (`after insert` trigger): when two reports for the same store match, mark both verified and give each person **+10 points**
3. Verified price and stock reports update `listings`
4. **RLS:** only **verified Shoppers** can insert reports; Retailers and unverified users can't

### Step 2: Test the rules in SQL
`supabase/tests/reports.test.sql` (pgTAP):
- 5 queue reports OK, the **6th fails**
- 3 price updates OK, the **4th fails**
- Two matching reports → both verified, +10 points each
- A Retailer's insert fails
```bash
npm run db:reset
npx supabase test db
```

### Step 3: Price validation (frontend)
In `utils/validation.js` add `isValidPrice()`. Test first:
- `34.99` ✅
- `34.999` ❌, `-1` ❌, `abc` ❌

### Step 4: The screen (frontend)
1. Read `storeId` from the URL (`useParams`)
2. **Queue tab:** 4 `QueueTile`s (No Queue / Short / Moderate / Long) → **Confirm**
3. **Price tab:** pick a product, enter a price (show `messages.invalidPrice` if invalid)
4. **Stock tab:** in stock / low / out of stock
5. **Location check:** use the browser's location; more than **50 km** from the store → show `messages.locationMismatch`, but still save (as unverified)
6. **Success:** go back to `/stores/:storeId` and show the toast "Queue report submitted. Thank you for your contribution!"
7. **Errors:** the limit error → `messages.queueLimit` / `messages.priceLimit`; Retailer or unverified → `messages.forbidden`; offline → disable Confirm

### Step 5: Connect the route
```jsx
import ReportSubmission from './screens/elias/ReportSubmission.jsx'
<Route path="stores/:storeId/report" element={<ReportSubmission />} />
```

### Step 6: Test, compare, PR
- `ReportSubmission.test.jsx`: choosing "Long Line" and confirming calls submit; the limit error shows the right message; an invalid price shows the error
- Compare with the S5 boards at 360px and 1200px
- PR: `feat: add Report Submission screen S5 and report rules (#18)` with `Closes #18`. Two PRs is fine: **database rules** first, then the **screen**

## 🏁 Done when
- [ ] **T-US3-1:** S3 → Report Queue Status → "Long Line (30+ Mins Wait)" → Confirm → back on S3 with the thank-you message and an updated queue panel
- [ ] **T-US3-2:** the 6th queue report in an hour shows "Submission limit reached. You can submit up to 5 queue reports per store per hour."
- [ ] The 4th price update in an hour is blocked; an invalid price shows "Enter a valid price, e.g. 34.99"
- [ ] A Retailer or unverified user sees "You can't do that."
- [ ] SQL tests and unit tests pass in CI; matches Stitch at 360px and 1200px; works on the live link
- [ ] A teammate approved with a comment, and **they** merged it

## 🤝 Talk to
- **Mpho:** the `report_logs` table (#8)
- **Kabelo:** S3's "Report" button (#12), verified users (#14), and `validation.js` (you both add to it)
- **Refilwe:** verified reports trigger her notification on S6 (#20)
