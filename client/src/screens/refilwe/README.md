# Refilwe's screens

**Your Issues:** **#16 F2 Basket** (in progress) · **#20 F5 Savings end-to-end** (this folder)
**Due:** Final submission, **Fri 20 Nov 10:00**. #20 is a Should feature: start it once the Musts are on track.
**Read first:** [the team workflow](../README.md) · Issues #16 and #20 · `docs/IMPLEMENTATION_PLAN.md` Phase 7

## 🎯 What you're building
| Screen | Route | Status | Stitch boards |
|---|---|---|---|
| S4 Shopping Basket | `/basket` | ✅ built, in `client/src/pages/Basket.jsx` (leave it there) | `docs/designs/queueless_s4_shopping_basket*` |
| S6 Savings Dashboard | `/savings` | 🆕 build here | `docs/designs/queueless_s6_savings_analytics_dashboard/` · `..._desktop_1200px/` · `..._states/` |

**S6 Savings** shows how much the shopper has saved by using Queueless: saved this month, reward points, reports this month, a 4-month bar chart, recent activity, and account settings (log out, delete account).

## 📂 Files you'll create
```
client/src/screens/refilwe/
├── Savings.jsx                the page
├── SavingsSummary.jsx         saved this month / points / reports tiles
├── SavingsChart.jsx           4-month bar chart
├── RecentActivity.jsx         list of recent savings and reports
├── AccountSettings.jsx        log out + delete account (with confirm modals)
├── useSavings.js              React Query hook → GET /api/me/savings
└── __tests__/Savings.test.jsx

server/src/routes/savings.js   GET /api/me/savings
server/src/routes/account.js   log out everywhere, delete account
server/src/jobs/priceDrop.js   email when the basket total drops > 10%
server/src/lib/email.js
server/tests/savings.test.js
supabase/migrations/<timestamp>_savings.sql
```

## ✅ Already built, reuse these
- Your own basket code: `useBasket`, `basketTotals.js` (it already works out the cheapest store and the saving)
- `Card`, `Button`, `EmptyState`, `ErrorState`, `SkeletonRows`, `Toast`
- `formatZAR` and date helpers in `lib/format.js`
- `api()` in `lib/api.js` sends the log-in token automatically

## 🛠️ Step by step

### Finish #16 first
The remaining items on #16 (saving the basket for logged-in users and merging the guest basket on log-in) need Kabelo's log-in (#14). Do them as a small PR once #14 is merged, and close #16 with it.

### Step 1: Database (backend)
```bash
npm run db:migration -- savings
```
- Table `savings_events (id, user_id, basket_id, amount_cents, created_at)`
- RLS: users can only read their own rows
- Rule: **one saving per basket per day** when the user views S4 = (2nd-cheapest − cheapest complete store total). **Confirm this rule with Joy (Product Owner)** before building it
- Test with pgTAP, then `npm run db:reset`

### Step 2: API routes (backend)
- `GET /api/me/savings` (behind `requireUser` from #14) returns:
  ```json
  { "monthTotalCents": 1250, "points": 120, "reportsThisMonth": 4,
    "last4Months": [{ "month": "2026-08", "cents": 300 }], "recent": [] }
  ```
- `server/src/routes/account.js`: log out everywhere, delete account (removed within 7 days by a scheduled job)
- `priceDrop.js` + `email.js`: send an email when the basket total drops more than 10%
- Tests with `supertest`: 401 without log-in; correct totals with log-in

### Step 3: The screen (frontend)
1. `useSavings.js` calls `api('/me/savings')`
2. `Savings.jsx` lays out `SavingsSummary`, `SavingsChart`, `RecentActivity`, `AccountSettings` like the Stitch board
3. **New user:** show R0.00 and "Start comparing prices to track your savings."
4. Log out → back to S1; delete account → confirm modal first
5. States: loading skeleton, error, offline

### Step 4: Connect the route
```jsx
import Savings from './screens/refilwe/Savings.jsx'
<Route path="savings" element={<Savings />} />
```

### Step 5: Test, compare, PR
- `Savings.test.jsx`: new-user empty state; totals shown in rand; log out goes to S1
- Compare with the S6 boards at 360px and 1200px
- PR: `feat: add Savings dashboard S6 (#20)` with `Closes #20`

## 🏁 Done when
- [ ] A new user sees R0.00 and the empty-state message
- [ ] Viewing a basket where the cheapest store saves money adds to "Saved this month"
- [ ] Log out works; delete account asks to confirm and removes the account within 7 days
- [ ] A verified report shows a notification that opens S6
- [ ] Tests pass; matches Stitch at 360px and 1200px; works on the live link
- [ ] A teammate approved with a comment, and **they** merged it

## 🤝 Talk to
- **Kabelo:** `requireUser` and log-in (#14)
- **Elias:** verified reports (#18) trigger your notification
- **Joy:** confirm how a "saving" is counted
