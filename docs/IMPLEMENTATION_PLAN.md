# Queueless — Implementation Plan

**Version:** v2.0 (replaces the v1.0 MASTER build plan) · **Date:** 11 Nov 2026 · **Target:** M4 MVP built by 08 Jan 2027
**Built from:** PRD v1.0 (`docs/PRD.md`) + the Stitch designs (22 boards in `docs/designs/`) + the existing repo setup (`client/` + `server/` npm workspaces).
**Stitch project:** https://stitch.withgoogle.com/projects/14854798444949179025

> How to use this file: give it to your AI coding assistant together with `docs/PRD.md`. Build **one phase per session**. Do not start a phase until the previous phase's Definition of Done is all ticked. Open the Stitch screenshots listed for each phase (`docs/designs/<folder>/screen.png`) while building that phase.

**What changed from v1.0:** fits the repo as it is now (React client + Express API in npm workspaces, instead of a single Vite app); uses the Stitch designs for every screen; adds the missing Store, Suburb and Basket tables; adds account screens A1–A4; resolves the report-limit conflict between US3 and BR2 in favour of BR2; and lists 16 decisions the team must confirm (§0).

---

## 0. Decisions you must confirm before Phase 1

The PRD and the Stitch designs leave these open. This plan uses the **Proposed default** column. Change it here if you disagree. The coding assistant must follow this table.

| # | Gap | Where | Proposed default used in this plan |
|---|---|---|---|
| D1 | PRD data model has no **Store**, **Suburb**, **Basket** or **BasketItem** entity. `Listing` stores the store as free text (`store_branch_name`). Baskets, store details, suburb filtering and queue reports cannot work without them. | PRD §10 | Add `suburbs`, `stores`, `baskets`, `basket_items`. `listings.store_id` replaces `store_branch_name`. |
| D2 | Queue reports are per **store**, but `ReportLog` links only to a **Listing** (a product at a store). | PRD §10.1 | `report_logs` gets `store_id` (required). `listing_id` is required only for `Price`/`Stock` reports. |
| D3 | `User.password_hash` conflicts with §12.3 ("passwords handled exclusively by Supabase Auth"). | PRD §10.1 | No password column. Use Supabase `auth.users` + a `profiles` table (role, display name, suburb, reward points). |
| D4 | When a report counts as **"verified"** (needed for the +10 points notification) is not defined. | PRD §4.5 | A report is verified when **1 other shopper** submits the same queue level (or the same price ±R0.50) for the same store within **30 minutes**. Both reporters get +10 points. |
| D5 | **Amber #B26A00 fails 4.5:1 contrast** as text on white (~4.2:1). | PRD §9.1, §12.1 | Keep `#B26A00` for icons and borders. Use **`#9A5B00`** (~5.4:1) for amber **text**. |
| D6 | **Supabase has no South Africa region.** PRD §12.4 says data is stored in South Africa. | PRD §12.4 | Pick the closest available region in the Supabase dashboard and update the POPIA table to state the real region and that it is a cross-border transfer (POPIA s72). |
| D7 | No design for **"Set new password"**. This is the page the reset email link opens. | A3 | Build it in the A3 style: two password fields + "Save new password". Mark it `TODO: design` in the PR. |
| D8 | No **Privacy Notice** page content. | PRD §12.4 | Route `/privacy` with a TODO content block. You write the text. |
| D9 | **Contributor level** names and thresholds are undefined. | S6 | Keep the grey `TODO: contributor level names and thresholds` box from Stitch. |
| D10 | **Admin and Retailer dashboards** (Feature 7) and the **retailer catalog-sync email** have no screens. | PRD §4, §4.5 | **Deferred.** Retailer sign-ups are created and approved manually in Supabase. |
| D11 | **Per-account lockout** (5 wrong passwords → 15 min) is not built into Supabase Auth. | PRD §5 | Express route `POST /api/auth/login` counts failures in a `login_attempts` table, then signs in and returns the session to the client. |
| D12 | PRD says **Jest 29.7**. Vite projects normally use Vitest. | PRD §11.1 | Use **Jest 29.7** as the PRD says (with `babel-jest`), in both workspaces. |
| D13 | Libraries the PRD doesn't name but the app needs. | — | Client: `react-router` v7 (routes), `@tanstack/react-query` v5 + persister (caching and offline), `lucide-react` (icons). Server: `resend` (email), `node-cron` (scheduled emails). Nothing else. |
| D14 | PRD §11.1 says "Supabase JS client, no custom middleware", but the repo has an **Express API** (`server/`). | PRD §11.1, README | Keep both. The **client** reads data directly from Supabase (anon key + RLS). The **server** handles only what needs a secret or a schedule: login lockout, account deletion, emails, scheduled jobs. Business rules that protect data (BR2, verification) live in the **database**, so they hold no matter which path writes. |
| D15 | PRD says **Vercel**, but the Express server serves `client/dist` in production (one Node service). Hosting is still TODO in the README. | PRD §11.1, README | Host the API + built client as **one Node service** (e.g. Render or Railway) and the database on Supabase. Tech Lead to confirm. |
| D16 | PRD says **PostgreSQL 16**; `supabase/config.toml` uses **17**. | PRD §11.1 | Use 17 (the Supabase default). Update the PRD. |

---

## 1. Summary and scope

**Product:** A mobile-first web app for South African shoppers: compare prices across nearby stores, build a basket to find the cheapest store, and report checkout queues.

**Must (MVP):** F1 Product Search & Price Compare · F2 Cross-Store Basket Aggregator · F3 Crowd-sourced Queue Level Reporter · Accounts (PRD §5).
**Should:** F4 Suburb Filter Settings · F5 Savings Log Dashboard.

**Non-goals (PRD §3.2):** no maps or routing, no payments or checkout, no receipt OCR.

**Deferred: must NOT be built:**
- Admin dashboard and Retailer catalog upload panel (Feature 7), and the retailer "Catalog sync complete" email.
- Barcode scanning, WhatsApp bot, 15% watchlist push alerts (PRD §4.3).
- Push notifications of any kind.
- Anything shown in Stitch that is not in the PRD (see §9.2 "Stitch content to ignore").

---

## 2. Tech stack and setup

| Layer | Choice (as already set up in the repo, plus additions) |
|---|---|
| Frontend (`client/`) | React 19 + Vite 8 (SPA) |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`, tokens in `@theme`) |
| Routing | react-router v7 |
| Data / cache | @tanstack/react-query v5 + `@tanstack/query-sync-storage-persister` (offline cache) |
| API (`server/`) | Node 20.19+ + Express 5 (service-role Supabase client) |
| Database | Supabase: Postgres 17, Auth, Realtime, Storage, pg_cron |
| Email | Resend (Supabase Auth custom SMTP for sign-up/reset emails; `resend` SDK in `server/` for notifications) |
| Tests | Jest 29.7 + babel-jest (+ @testing-library/react in `client/`) |
| Hosting | One Node service for API + built client; Supabase for the database (D15) |
| Package manager | npm 10, npm workspaces |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |

### 2.1 Setup commands
The repo is already set up. From the repo root, run these one at a time:
```bash
npm install
```
```bash
npm install -w client react-router @tanstack/react-query @tanstack/react-query-persist-client @tanstack/query-sync-storage-persister lucide-react
```
```bash
npm install -D -w client tailwindcss @tailwindcss/vite jest@29.7 babel-jest @babel/preset-env @babel/preset-react @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```
```bash
npm install -w server resend node-cron
```
```bash
npm install -D -w server jest@29.7 supertest
```
Then add `"test": "jest"` to `client/package.json` and `server/package.json`, and `"test": "npm test -ws"` to the root `package.json`.

### 2.2 Folder structure
Existing files are marked *(exists)*; everything else is new.
```text
Queueless/
├── docs/
│   ├── PRD.md                            (exists)
│   ├── Implementation plan.md            (this file)
│   └── designs/                          # Stitch export (reference only, never imported)
├── client/
│   ├── index.html                        (exists) add Inter font link
│   ├── vite.config.js                    (exists) add tailwindcss() plugin
│   ├── .env.example                      (exists)
│   └── src/
│       ├── main.jsx                      (exists) add QueryClient + persister + Router
│       ├── App.jsx                       (exists) becomes the route table
│       ├── index.css                     (exists) replace with @import "tailwindcss"; @theme tokens (§9.1)
│       ├── lib/
│       │   ├── supabase.js               (exists)
│       │   ├── api.js                    # fetch wrapper for /api/* (adds the user's access token)
│       │   ├── format.js                 # formatZAR, formatDate, formatTime (en-ZA, SAST)
│       │   └── messages.js               # every exact user-facing string (PRD §12.2 etc.)
│       ├── utils/                        # pure business logic, unit-tested
│       │   ├── priceAge.js               # BR1
│       │   ├── basketTotals.js           # BR3
│       │   ├── queueDecay.js             # BR4 (mirror of SQL view, for tests)
│       │   └── validation.js             # password + price rules
│       ├── hooks/                        # useAuth, useOnline, useBasket, useStore, useSearch …
│       ├── components/
│       │   ├── layout/                   # GlobalHeader, BottomTabBar, DesktopNav, Footer, AppShell
│       │   ├── feedback/                 # OfflineBanner, Toast, ErrorState, EmptyState, Skeleton, Modal, BottomSheet
│       │   ├── ui/                       # Button, TextField, PasswordField, Checkbox, Select, Card
│       │   └── domain/                   # StockBadge, QueueBadge, PriceAgeBadge, CheapestPill, MissingItemsPill,
│       │                                 # ProductResultCard, StorePriceRow, StoreRow, QueuePanel, StoreComparisonCard, QueueTile
│       ├── pages/                        # Home, SearchResults, StoreDetails, Basket, ReportSubmission, Savings,
│       │                                 # Login, Signup, ForgotPassword, ResetPassword, VerifyEmail, Privacy, NotFound
│       └── __tests__/
├── server/
│   ├── .env.example                      (exists) add RESEND_API_SECRET_KEY
│   ├── scripts/seed-users.js             # creates the PRD §10.4 test accounts (§11)
│   └── src/
│       ├── index.js                      (exists) mount routes + start jobs
│       ├── lib/supabase.js               (exists)
│       ├── lib/email.js                  # Resend wrapper
│       ├── middleware/requireUser.js     # checks the Bearer token with supabase.auth.getUser()
│       ├── routes/auth.js                # POST /api/auth/login (lockout, D11)
│       ├── routes/account.js             # POST /api/account/delete
│       ├── jobs/priceDrop.js             # hourly basket price-drop email (node-cron)
│       └── __tests__/
├── supabase/
│   ├── config.toml                       (exists) auth settings in §7
│   ├── migrations/                       (exists) one file per step, see §4
│   └── seed.sql                          (exists) fill in §11
└── package.json                          (exists) npm workspaces
```

> **Note:** the PRD (§11.6) shows a single `src/` folder with migrations in `src/supabase/`. The repo's `client/` + `server/` + `supabase/` layout replaces that. Update PRD §11.6 to match.

---

## 3. Environment variables

`client/.env.example` (exists, no change). These values are public and safe in the browser bundle, because RLS protects the data:
```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=your-anon-key
```

`server/.env.example` (exists; add the last line). These are secrets and never leave the server:
```bash
PORT=3001
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_SECRET_KEY=your-resend-key
```
The root `.gitignore` already ignores `.env` and `.env.local`. Never prefix a secret with `VITE_`, because anything with that prefix is shipped to the browser.

---

## 4. Database (migrations)

All times are stored in UTC (`timestamptz`) and shown in SAST. All IDs are `uuid default gen_random_uuid()`.

Create each migration with `npm run db:migration -- <name>` (the CLI adds a timestamp). Apply locally with `npm run db:reset`. The existing `…_init.sql` is empty; leave it. Migrations in order: `schema`, `rls`, `queue_view`, `profiles_trigger`, `report_triggers`, `cron`, `savings`.

### 4.1 Migration `schema`
```sql
create type user_role    as enum ('Shopper','Retailer');
create type stock_status as enum ('In Stock','Limited Stock','Out of Stock','Unknown');
create type report_type  as enum ('Queue','Price','Stock');
create type queue_level  as enum ('none','short','moderate','long');

create table suburbs (            -- D1, PRD §10.4 reference data
  id uuid primary key default gen_random_uuid(),
  name text not null unique,      -- 'Hatfield','Arcadia','Benoni'
  city text not null
);

create table stores (             -- D1
  id uuid primary key default gen_random_uuid(),
  name text not null,             -- 'Shoprite Hatfield'
  suburb_id uuid not null references suburbs(id) on delete restrict,
  address text not null,          -- 'Hatfield, Pretoria'
  opening_hours text not null,    -- '08:00–20:00'
  latitude numeric(9,6), longitude numeric(9,6)   -- for the 50 km mismatch check only, never shown as a map
);

create table profiles (           -- D3, PRD 'User'
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique check (email = lower(email)),
  display_name text,
  role user_role not null default 'Shopper',
  retailer_approved boolean not null default false,
  suburb_id uuid references suburbs(id) on delete set null,
  reward_points int not null default 0 check (reward_points >= 0),
  is_16_or_older boolean not null,
  privacy_consent_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  barcode varchar(30) not null unique,
  product_name varchar(150) not null,
  brand_label varchar(80) not null,
  volumetric_size varchar(30) not null,
  thumbnail_path text            -- Supabase Storage, compressed < 50 KB
);

create table listings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,  -- "Delete this too"
  store_id uuid not null references stores(id) on delete cascade,      -- D1 replaces store_branch_name
  price_zar numeric(10,2) not null check (price_zar > 0),
  stock_status stock_status not null default 'In Stock',
  verified_at timestamptz not null default now(),
  unique (product_id, store_id)
);

create table report_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,             -- "Clear the field"
  store_id uuid not null references stores(id) on delete cascade,      -- D2
  listing_id uuid references listings(id) on delete cascade,           -- "Delete this too"
  report_type report_type not null default 'Queue',
  submitted_value varchar(50) not null,      -- queue_level value, or '34.99', or a stock_status
  is_verified boolean not null default false,          -- D4
  location_mismatch boolean not null default false,    -- PRD §6.2 (>50 km)
  created_at timestamptz not null default now(),
  check (report_type = 'Queue' or listing_id is not null)
);

create table baskets (            -- D1
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title varchar(60) not null default 'My basket',
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);
create unique index one_active_basket on baskets(user_id) where is_active;

create table basket_items (
  basket_id uuid not null references baskets(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity int not null default 1 check (quantity between 1 and 99),
  primary key (basket_id, product_id)
);

create table notifications (      -- PRD §4.5 in-app
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  link_to text not null,          -- '/savings'
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table login_attempts (     -- D11
  email text primary key,
  failed_count int not null default 0,
  locked_until timestamptz
);

create index on listings(product_id);
create index on listings(store_id);
create index on report_logs(store_id, report_type, created_at desc);
create index on report_logs(user_id, store_id, report_type, created_at desc);
create index products_name_search on products using gin (to_tsvector('english', product_name || ' ' || brand_label));
```

### 4.2 Status changes (PRD §10.3)
`listings.stock_status` changes only through (a) a `Stock` report from a verified shopper (trigger copies the value and sets `verified_at = now()`), or (b) a service-role update by a retailer import (deferred). Every `Price` report updates `price_zar` + `verified_at` **only once it is verified (D4)**.

### 4.3 Guest basket
Guests keep their basket in `localStorage` (key `queueless.basket`). On login, it is merged into the active `baskets` row (quantities added), then cleared.

---

## 5. Permissions (RLS): one rule per PRD §11.4 row

Enable RLS on every table. Policies:

| Table | Action | Rule |
|---|---|---|
| profiles | select / update | `id = auth.uid()` (owner only). `role`, `reward_points`, `retailer_approved` can't be changed by the client (column-level `revoke update`). |
| products | select | everyone (`anon`, `authenticated`) |
| suburbs, stores | select | everyone |
| listings | select | everyone |
| listings | update | **no direct client update.** Changes come only through report triggers (verified shopper) and the service role (retailer). This enforces BR2 at the source. |
| report_logs | insert | `auth.uid() = user_id` AND email confirmed (`auth.jwt()->>'email_confirmed_at' is not null` via a helper function) AND `role = 'Shopper'` AND passes BR2 (see §6). |
| report_logs | select | own rows only |
| baskets, basket_items | all | owner only (`user_id = auth.uid()` through the basket) |
| notifications | select / update(read_at) | owner only |
| login_attempts | none | service role only |

**Express server rule:** the server uses the service-role key, which **bypasses RLS**. So every `server/` route that acts for a user must first run `requireUser` (checks the `Authorization: Bearer <access token>` header with `supabase.auth.getUser()`), and must only touch that user's rows.

A blocked write returns a Postgres error. The client maps it to `"You can't do that."` (wrong role / unverified) or the BR2 message.

---

## 6. Business rules: logic and where each runs

### BR1: Price age warning (client, `src/utils/priceAge.js`)
```
isStale(verified_at, now) = (now - verified_at) > 48 hours
if isStale → render PriceAgeBadge "Unverified for 2 days" (amber, ! icon)
```
Used on S2 and S3 (and S4 item breakdown).

### BR2: Report throttling (database, `before insert` trigger on `report_logs`)
```
limit = 5 if NEW.report_type = 'Queue' else 3          -- Price and Stock share the 3 limit
count = rows in report_logs where user_id = NEW.user_id
        and store_id = NEW.store_id
        and (report_type = 'Queue') = (NEW.report_type = 'Queue')
        and created_at > now() - interval '60 minutes'
if count >= limit → raise exception 'BR2_LIMIT' using errcode 'P0001'
```
Client maps `BR2_LIMIT` to:
- Queue → `"Submission limit reached. You can submit up to 5 queue reports per store per hour."`
- Price → `"Submission limit reached. You can submit up to 3 price updates per store per hour."`

S5 also shows the limit captions, and disables Confirm after a `BR2_LIMIT` error.

### BR3: Basket totals with missing items (client, `src/utils/basketTotals.js`)
```
for each store in nearby stores:
  available = basket items that have a listing (a price) at this store
  missing   = basket items - available          -- PRD: store "does not carry" the item
  (an available item that is 'Out of Stock' still counts in the total, but its StockBadge
   is shown in the item breakdown so the shopper can see it)
  total     = Σ listing.price_zar × quantity over available
  complete  = missing is empty
rank complete stores by total ascending → first = "Cheapest"
incomplete stores: shown after complete ones, separated, never "Cheapest",
  pill = "Missing N Item(s)", line per missing item: "<product>: Price unavailable at this branch"
saving = 2nd-cheapest complete total − cheapest complete total
banner = "Great choice! You are saving R{saving} on this basket selection by choosing {chain} today."
```
> **Confirm:** should an **Out of Stock** item count as missing? This plan says **no**, because the Stitch S4 design shows Pick n Pay Hatfield as a complete R102.97 basket even though its milk is Out of Stock in the sample data. If you want Out of Stock treated as missing, Pick n Pay also becomes "Missing 1 Item" and the S4 design must change.

### BR4: Queue time-decay (database view `store_queue_status`, mirrored in `src/utils/queueDecay.js` for tests)
```
score(level): none=0, short=1, moderate=2, long=3
age = minutes since report
weight(age) = 0.8                          if age <= 15
            = 0.8 × (120 − age) / 105      if 15 < age < 120
            = 0                            if age >= 120
value = Σ(weight × score) / Σ(weight) over Queue reports for the store in the last 120 min
level = round(value) mapped back to none/short/moderate/long
if no reports in 120 min → 'Unknown'
also return: report_count, last_report_at
```
pg_cron runs every 15 minutes and deletes queue reports older than 24 hours from the hot index (keep the history rows for G2 metrics).

### D4: Report verification (database trigger `after insert` on `report_logs`)
```
match = another user's report, same store, same type,
        same value (queue) or |price diff| <= 0.50 (price),
        created within 30 min, not location_mismatch
if match and neither is verified:
  set both is_verified = true
  add 10 reward_points to both users
  insert notification for both: "Thank you! Your update for {store} has been verified. +10 points added." link '/savings'
  if Price/Stock: update listing price_zar/stock_status, verified_at = now()
```

### Location mismatch (PRD §6.2): client and database
The client sends the device's approximate coordinates, if the user allows it. If the store is more than 50 km away, show the amber `"Location mismatch alert"`. The report is still saved with `location_mismatch = true` and is never used for verification. If location is denied, there is no check.

---

## 7. Accounts (PRD §5): how each decision is built

| Decision | Implementation |
|---|---|
| Email + password only | Supabase Auth email provider; all OAuth providers off. |
| Open shopper sign-up; retailers approved | Sign-up always creates `role='Shopper'`. The A2 note "Retailer? Retailer accounts are approved by our team." Retailer role is set by an admin in Supabase (D10). |
| Age 16+ | A2 checkbox "I am 16 or older" is required; stored as `profiles.is_16_or_older`. |
| Privacy consent | A2 checkbox "I agree to the Privacy Notice" (unticked by default, links to `/privacy`); stored as `privacy_consent_at`. |
| Email verification | `supabase/config.toml` → `[auth.email] enable_confirmations = true` (currently `false`). Unverified users are routed to A4 after sign-up and can browse but not save or report. RLS blocks their writes. |
| Password rules | `≥8 chars, ≥1 uppercase, ≥1 number`, checked in `validation.js`. In `config.toml` set `minimum_password_length = 8` (currently 6) and `password_requirements = "lower_upper_letters_digits"` (the closest built-in option; it also requires a lowercase letter, so show that in the A2 helper text or rely on client validation only). Show/hide eye icon. |
| Forgot password | A3 → `resetPasswordForEmail(email, { redirectTo: '<site>/reset-password' })`. `config.toml` already has `otp_expiry = 3600` (1 hour). Set `site_url = "http://127.0.0.1:5173"` (currently port 3000) and add `/reset-password` to `additional_redirect_urls`. |
| Lockout | `POST /api/auth/login` in `server/` (D11): if `locked_until` is in the future, return the lock message; otherwise call `signInWithPassword`. 5 consecutive failures → `locked_until = now() + 15 min` → A1 shows `"Account locked for 15 minutes after 5 incorrect attempts."`. Success resets the count and returns the session; the client calls `supabase.auth.setSession()`. |
| Stay logged in 30 days | Supabase Auth sessions: time-box and inactivity timeout 30 days (`[auth.sessions]` in `config.toml`, and the same in the hosted dashboard). |
| Log out | S6 profile tray → modal "Log out of Queueless?" → `signOut()` → S1. |
| Delete account | S6 → modal (exact PRD text) → `POST /api/account/delete` marks `profiles.deletion_requested_at`; a pg_cron job (migration `cron`) hard-deletes the auth user (cascades) within 7 days. |
| Change email | S6 "Change email" → `updateUser({ email })` with "Secure email change" on (`[auth.email] double_confirm_changes = true`). |
| Emails | Sign-up, reset and change-email emails: Supabase Auth custom SMTP → Resend. Notification emails: `server/src/lib/email.js` → Resend. |

---

## 8. Navigation and routes

| Route | Screen | Tab bar (mobile) | Desktop nav | Auth |
|---|---|---|---|---|
| `/` | S1 Home (Search Landing) | ✓ Home | ✓ | guest ok |
| `/search?q=` | S2 Search Results | ✓ Home | ✓ | guest ok |
| `/stores/:storeId` | S3 Store Details | ✓ Home | ✓ | guest ok |
| `/basket` | S4 Shopping Basket | ✓ Basket | ✓ | guest ok (local basket) |
| `/stores/:storeId/report?type=queue\|price` | S5 Report Submission | ✗ hidden | ✓ | verified Shopper |
| `/savings` | S6 Savings Analytics Dashboard | ✓ Savings | ✓ | logged in, else → `/login` |
| `/login` | A1 Log in | ✗ | header only | — |
| `/signup` | A2 Sign up | ✗ | header only | — |
| `/forgot-password` | A3 Forgot password | ✗ | header only | — |
| `/reset-password` | Set new password (D7) | ✗ | header only | link token |
| `/verify-email` | A4 Verify your email | ✗ | header only | — |
| `/privacy` | Privacy Notice (D8) | ✓ | ✓ | guest ok |

**Navigation rules (PRD §7.2):** S1 → S2 (search), S1 → S3 (store row), S1 → S6 (profile icon), S2 → S3 (store price row), header basket icon → S4, S3 → S5 (both report buttons; a guest sees a bottom sheet → A1), S4 store header → S3, S5 success → S3 with toast, A1 → A2 / A3, A2 → A4, A1 success → previous page or S1.

**Responsive:** below 640px use the single-column mobile layout with the bottom tab bar. At 640px and above, use the desktop layout: header nav links "Home / Basket / Savings", no tab bar, content max width 1200px, centred.

---

## 9. Design tokens and shared components

### 9.1 Tokens: `src/index.css`
```css
@import "tailwindcss";

@theme {
  --font-sans: "Inter", system-ui, sans-serif;

  --color-primary: #0B7A6B;
  --color-primary-pressed: #085A4F;
  --color-savings: #2E7D32;
  --color-bg: #FFFFFF;
  --color-surface-soft: #F9F9F9;
  --color-ink: #1A1A1A;
  --color-muted: #5F6368;
  --color-border: #E0E0E0;

  --color-amber: #B26A00;        /* icons, borders only */
  --color-amber-text: #9A5B00;   /* D5: amber text */
  --color-amber-bg: #FFF8E1;
  --color-red: #C62828;
  --color-red-bg: #FFEBEE;
  --color-green-bg: #E8F5E9;
  --color-grey-pill-bg: #F1F3F4;
  --color-live: #1565C0;

  --radius-card: 8px;
  --radius-input: 6px;
  --radius-button: 24px;

  --text-page-title: 24px;  --text-section: 20px;  --text-card-title: 18px;
  --text-body: 16px;        --text-price: 22px;    --text-caption: 14px;
}
```
Load Inter 400/500/600/700 from Google Fonts in `index.html`. Spacing scale 4/8/12/16/24/32px; mobile side margin 16px. Minimum control height 48px; touch targets ≥44×44px.

### 9.2 Using the Stitch export

- Unzip to `docs/designs/`. Each folder holds `screen.png` (look at this) and `code.html` (copy layout and spacing ideas, **never paste it in**).
- The boards are **showcase sheets**: they include meta bars, frame labels ("Frame 2: Loading State", "PRIMARY"), and multiple frames side by side. Build only the app UI inside each frame.

| Stitch folder | Builds |
|---|---|
| `queueless_design_system_sheet` | §9.1 tokens + all `ui/`, `feedback/`, `domain/` badge components |
| `queueless_s1_home_search_landing` (+`_states`, `_desktop_1200px`) | S1 |
| `queueless_s2_search_results` (+`_states`, `_desktop_1200px`) | S2 |
| `queueless_s3_store_details` (+`_states`, `_desktop_1200px`) | S3 |
| `queueless_s4_shopping_basket` (+`_states`, `_desktop_1200px`) | S4 |
| `queueless_s5_report_submission` (+`_states`, `_desktop_1200px`) | S5 |
| `queueless_s6_savings_analytics_dashboard` (+`_states`, `_desktop_1200px`) | S6 |
| `queueless_account_screens_a1_a4` (+`_states_variations`, `_desktop_a1_a4`) | A1–A4 |

**Stitch content to ignore or correct (the PRD wins):**

| Board | Problem | Do this instead |
|---|---|---|
| S1 desktop | Suburb options "Brooklyn, Menlyn, Centurion"; "Save R18.50"; extra "Compare Store Totals" and "Queue & Price Insights" blocks | Suburbs come from the `suburbs` table; saving comes from BR3; drop the extra blocks |
| S2 desktop | "Save R12.50" | Saving comes from BR3 |
| S5 main board, frame 4 | Old text "…once every 15 minutes" | Use the BR2 text (the `_states` board is correct) |
| A1–A4 desktop | Footer links "Terms of Service", "Support" | Footer shows only "Privacy Notice" |
| S6 / S5 | Extra helper sentences (e.g. "You will need to sign in again…", "You appear to be away from…") | OK to keep. Add them to `messages.js` and to the PRD |
| All | Brand names "Huletts", "Sunfoil" | Fine as seed `brand_label` values |

### 9.3 Shared components (PRD §8.3 + Stitch)

| Component | Notes |
|---|---|
| `GlobalHeader` | "Queueless" title; back arrow on every screen except S1; profile icon (S1); basket icon with count badge. Desktop: nav links in the centre. |
| `BottomTabBar` | Home / Basket / Savings, active tab teal; mobile only; hidden on S5 and A1–A4. |
| `OfflineBanner` | Grey bar under the header: `"You're offline. Changes will not be saved."`; driven by `useOnline()`. |
| `Toast` | Dark bar near the bottom, auto-dismiss after 3 s, `role="status"`. |
| `EmptyState`, `ErrorState`, `Skeleton` | ErrorState: `"Something went wrong. Try again."` + "Try again" button. |
| `Modal`, `BottomSheet` | Focus-trapped, Esc closes, `aria-modal`. |
| `StockBadge` | ✓ In Stock (green) · ! Limited Stock (amber) · ✕ Out of Stock (red) · ? Unknown (grey). Always icon + text. |
| `QueueBadge` | No Queue / Short Line (under 10 Mins Wait) / Moderate Line (10–30 Mins Wait) / Long Line (30+ Mins Wait) / Unknown. |
| `PriceAgeBadge`, `CheapestPill` (★ Cheapest), `MissingItemsPill` | BR1, BR3 |
| `LivePrice` | When a realtime update changes the price, the text turns `--color-live` with a fade for 3 s and shows "Price just updated". |

---

## 10. Notifications, errors, quality, security and privacy

### 10.1 Notifications (PRD §4.5)
| Trigger | Built how | Phase |
|---|---|---|
| Report verified | D4 trigger inserts into `notifications`; S6 shows it as a top banner; the header can show an unread dot. Text: `"Thank you! Your update for {store} has been verified. +10 points added."` → `/savings` | 7 |
| Basket total changes by >10% | `server/src/jobs/priceDrop.js` runs hourly (node-cron) and compares each active basket's cheapest complete total with the last stored total; if the change is >10%, sends an email through Resend: `"Price drop alert: Your active grocery basket is now R{diff} cheaper at {store}!"` with a link to `/basket` | 7 |
| Retailer catalog sync | **Deferred** (D10) | — |

### 10.2 Error messages: all in `src/lib/messages.js`, exact text
| Situation | Message |
|---|---|
| No internet | `You're offline. Changes will not be saved.` |
| Server / unknown | `Something went wrong. Try again.` |
| Session expired | `Session expired. Please log in again to save your changes.` → A1, keep unsaved edits in `sessionStorage` |
| Wrong role / not verified | `You can't do that.` |
| Add-to-basket network failure | `Action failed. Please verify your internet connection and try again.` |
| No search results | `No products found matching your search term. Please try another product name.` |
| BR2 limits | see §6 |
| Missing price | `Price unavailable at this branch` |
| Location | `Location mismatch alert` |
| Login | `Incorrect email or password.` / lockout text |
| Password | `Password must include at least 1 uppercase letter and 1 number` |
| Price field | `Enter a valid price, e.g. 34.99` |
| Form fields | Red border + message under the field; the typed value is kept |

### 10.3 Quality rules (PRD §12.1): how each is met
- **Speed:** every route shows content or a `Skeleton` within 2 s; lazy-load routes (`React.lazy`); measure with `performance.mark` around search (G1).
- **Data:** thumbnails < 50 KB WebP from Supabase Storage; lists page 10 at a time ("Load more"); no video.
- **Offline:** the react-query persister caches search results, store details and the basket in `localStorage`; all mutations are disabled when `navigator.onLine === false`; the OfflineBanner is shown.
- **Devices:** tested at 360px, 768px and 1200px in Chrome, Safari and Edge.
- **Locale:** `Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR'})` gives `R 1 234,50` in some browsers, so write `formatZAR` by hand to always output `R1,234.50`. Dates as `12 Mar 2026`, 24-hour time, `Africa/Johannesburg` time zone.
- **Accessibility:** 44×44px targets, 4.5:1 contrast (D5), 16px minimum body text, visible focus rings, `aria-live` for toasts and errors.
- **Scale:** 500 concurrent users. Indexes from §4.1; BR4 as a view (make it a materialized view refreshed every minute if needed).
- **Abuse:** BR2 trigger.

### 10.4 Security and privacy
- Only `VITE_` public keys in `client/`; `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_SECRET_KEY` live only in `server/.env` and the host's secret settings.
- RLS on every table (§5); every server route that acts for a user runs `requireUser` first.
- POPIA: consent checkbox on A2, `/privacy` linked in the A2 checkbox, S6 settings and the footer; account deletion within 7 days; the suburb preference can be cleared on S1; update the storage region (D6).

---

## 11. Seed data (`supabase/seed.sql`)

- **Suburbs:** Hatfield (Pretoria), Arcadia (Pretoria), Benoni (Ekurhuleni).
- **Stores (Hatfield):** Shoprite Hatfield, Pick n Pay Hatfield, Checkers Hatfield. Address "Hatfield, Pretoria", hours "08:00–20:00", approximate Hatfield coordinates.
- **Products:** Clover Full Cream Milk 2L (Clover), Albany Superior White Bread 700g (Albany), White Sugar 2kg (Huletts), Sunflower Oil 2L (Sunfoil). Use placeholder barcodes `6000000000011` … `6000000000044`.
- **Listings:**

| Product | Shoprite Hatfield | Pick n Pay Hatfield | Checkers Hatfield |
|---|---|---|---|
| Clover Full Cream Milk 2L | R36.99 · In Stock | R38.49 · Out of Stock | R37.99 · In Stock |
| Albany Superior White Bread 700g | R18.99 · Unknown | R19.49 · In Stock | R17.99 · In Stock |
| White Sugar 2kg | R42.99 · In Stock | R44.99 · In Stock · `verified_at` = now − 3 days | — (no listing) |
| Sunflower Oil 2L | R64.99 · Limited Stock · `verified_at` = now − 3 days | — | — |

- **Queue reports:** 6 recent `long` reports at Shoprite Hatfield, 2 `short` at Pick n Pay Hatfield, 2 `moderate` at Checkers Hatfield.
- **Test accounts (PRD §10.4):** create them with the Supabase Admin API in `server/scripts/seed-users.js` (run with `node --env-file=server/.env server/scripts/seed-users.js` after `npm run db:reset`). Also list them in the README "Test Logins" table:
  - Shopper `tester.joy@queueless.co.za`: display name "Joy Mokoena", suburb Hatfield, 120 points, active basket = Milk + Bread + Sugar.
  - `mpho.dev@queueless.co.za`: developer account, role Shopper.
  - Passwords as in PRD §10.4. **Before the repo goes public, move these passwords out of the PRD** into a local-only file.

---

## 12. Build phases

Every phase ends with an app that runs (`npm run dev` starts client and API) and passing tests (`npm test`). Work on a `feature/<phase-name>` branch and merge through a pull request (README "How We Work"). Build **mobile and desktop together** for each screen, using that screen's three Stitch boards. In the file lists, `client/…`, `server/…` and `supabase/…` are relative to the repo root.

### Phase 1: Foundation and one running screen
**Covers:** setup, tokens, env, database, seed, app shell · **Screens:** S1 (static) · **Stitch:** design system sheet, S1 boards
**Files:** `client/vite.config.js` (add Tailwind), `client/index.html` (Inter), `client/src/index.css` (tokens; remove `color-scheme: light dark`), `client/src/main.jsx`, `client/src/App.jsx` (routes, replaces the health-check page), `client/src/lib/{format,messages,api}.js`, `client/src/components/{layout,feedback,ui}/*`, `client/src/pages/Home.jsx`, migrations `schema` + `rls`, `supabase/seed.sql`, `supabase/config.toml` (§7 auth settings), `server/.env.example`, `client/jest.config.js`, `client/babel.config.cjs`, `.github/workflows/ci.yml` (add `npm ci` + `npm test` steps)
**Definition of Done**
- [ ] `npm run dev` shows S1 at 360px and 1200px, matching the Stitch boards (header, suburb selector, search bar, nearby stores, tab bar / desktop nav, footer)
- [ ] `/api/health` still returns `ok`
- [ ] S1 reads stores from Supabase; seeded data is visible
- [ ] All migrations apply cleanly with `npm run db:reset`
- [ ] RLS is on for every table
- [ ] OfflineBanner shows when the network is off in DevTools
- [ ] `formatZAR(1234.5) === "R1,234.50"` test passes
- [ ] CI runs the tests on every pull request

### Phase 2: F1 Product Search & Price Compare (Must)
**Covers:** F1 · US1 · S1, S2, S3 (read-only) · BR1, BR4 (display only) · **Stitch:** S2, S3 boards
**Files** (in `client/src/`): `pages/SearchResults.jsx`, `pages/StoreDetails.jsx`, `components/domain/{ProductResultCard,StorePriceRow,StockBadge,PriceAgeBadge,CheapestPill,QueuePanel,QueueBadge,StoreRow}.jsx`, `utils/priceAge.js`, `utils/queueDecay.js`, `hooks/{useSearch,useStore}.js`; migration `queue_view`
**Definition of Done**
- [ ] **T-US1-1:** search "White Sugar 2kg" on S1 → S2 lists matches with store prices ordered lowest first
- [ ] **T-US1-2:** a search with no matches shows "No products found matching your search term. Please try another product name."
- [ ] Prices older than 48 h show "Unverified for 2 days" (BR1); unit test passes
- [ ] S3 shows the queue panel from `store_queue_status` (BR4); `queueDecay` unit tests pass (0, 15, 67.5, 120 min weights)
- [ ] "Load more" pages 10 at a time
- [ ] Loading, Empty, Error and Offline states match the `_states` boards
- [ ] Live price update: changing a price in Supabase turns it blue on S2/S3 without a refresh (Realtime)

### Phase 3: Accounts (Must; needed by F2 saving and F3)
**Covers:** PRD §5, §12.4 consent · A1–A4, `/reset-password`, `/privacy` · **Stitch:** account boards
**Files:** `client/src/pages/{Login,Signup,ForgotPassword,ResetPassword,VerifyEmail,Privacy}.jsx`, `client/src/hooks/useAuth.js`, `client/src/components/ui/{PasswordField,Checkbox}.jsx`, `client/src/utils/validation.js`, `server/src/routes/auth.js`, `server/src/middleware/requireUser.js`, `server/scripts/seed-users.js`; migration `profiles_trigger` (create profile on sign-up)
**Definition of Done**
- [ ] Sign up requires both checkboxes; weak passwords show the exact error and keep the typed text
- [ ] The verification email arrives (via Resend); an unverified user sees A4 and cannot save or report
- [ ] 5 wrong passwords → lockout message; it unlocks after 15 min
- [ ] The reset link expires after 1 hour
- [ ] An expired session shows the session message and routes to A1 without losing unsaved edits
- [ ] A guest on S3 tapping a report button sees the "Log in to report queue or price updates." sheet
- [ ] Desktop: centred 440px cards

### Phase 4: F2 Cross-Store Basket Aggregator (Must)
**Covers:** F2 · US2 · S2 (add), S4 · BR3 · **Stitch:** S4 boards, S2 success state
**Files** (in `client/src/`): `pages/Basket.jsx`, `hooks/useBasket.js`, `utils/basketTotals.js`, `components/domain/{StoreComparisonCard,MissingItemsPill}.jsx`
**Definition of Done**
- [ ] **T-US2-1:** "Add to Basket" on several S2 rows increments the header badge; S4 shows the items and correct totals (Shoprite R98.97, Pick n Pay R102.97, Checkers R55.98 "Missing 1 Item")
- [ ] **T-US2-2:** a network failure while adding shows "Action failed. Please verify your internet connection and try again."
- [ ] Toast "Item added to your basket." appears
- [ ] BR3 unit tests: incomplete store is never "Cheapest"; saving = R4.00 for the seed basket
- [ ] Guest basket persists in localStorage and merges on login
- [ ] Rename, quantity stepper and remove work; all are disabled offline
- [ ] S4 store header opens S3

### Phase 5: F3 Crowd-sourced Queue Level Reporter (Must)
**Covers:** F3 · US3 · S3, S5 · BR2, BR4, D4, location mismatch · **Stitch:** S5 boards
**Files:** `client/src/pages/ReportSubmission.jsx`, `client/src/components/domain/QueueTile.jsx`; migrations `report_triggers` (BR2, D4, stock/price apply) and `cron`
**Definition of Done**
- [ ] **T-US3-1:** S3 → "Report Queue Status" → choose "Long Line (30+ Mins Wait)" → Confirm → back on S3 with "Queue report submitted. Thank you for your contribution!" and an updated queue panel
- [ ] **T-US3-2:** the 6th queue report in 60 min is blocked with "Submission limit reached. You can submit up to 5 queue reports per store per hour."
- [ ] Price tab: 4th price update in 60 min is blocked with the 3-per-hour message; an invalid price shows "Enter a valid price, e.g. 34.99"
- [ ] Location > 50 km → "Location mismatch alert"; the report is saved as unverified
- [ ] An unverified user or a Retailer gets "You can't do that."
- [ ] The BR2 trigger is tested directly in SQL (run 6 inserts and expect the 6th to fail)
- [ ] Two matching reports → both verified, +10 points each (D4)

### Phase 6: F4 Suburb Filter Settings (Should)
**Covers:** F4 · US4 · S1, S2
**Files:** `client/src/components/ui/Select.jsx` wiring, `client/src/hooks/useSuburb.js`
**Definition of Done**
- [ ] The S1 suburb selector lists suburbs from the database; changing it filters S1 stores and S2 prices
- [ ] Logged-in users get it saved to `profiles.suburb_id`; guests get it saved in localStorage
- [ ] A clear option removes the saved preference (POPIA §12.4)
- [ ] "Showing stores in {suburb}" updates

> PRD has **no US4 or US5 text or T- criteria**. Add them to the PRD before Phases 6–7, or accept the DoD above as the acceptance criteria.

### Phase 7: F5 Savings Log Dashboard + notifications + account settings (Should)
**Covers:** F5 · US5 · S6 · PRD §4.5 notifications · PRD §5 log out / delete / change email · **Stitch:** S6 boards
**Files:** `client/src/pages/Savings.jsx`, migration `savings` (`savings_events` table: when a user opens S4 and the cheapest store is chosen, log the saving), `server/src/routes/account.js`, `server/src/jobs/priceDrop.js`, `server/src/lib/email.js`
**Definition of Done**
- [ ] S6 shows saved this month, reward points, reports this month, the 4-month bar chart, recent activity and settings, matching Stitch at mobile and desktop widths
- [ ] Contributor level shows the TODO box (D9)
- [ ] The verified-report notification appears and opens S6
- [ ] The price-drop email is sent when the basket total changes by >10% (test by editing seed prices)
- [ ] Log out modal → signed out → S1; delete modal → account gone within 7 days (cron job tested)
- [ ] New-user empty state shows R0.00 and "Start comparing prices to track your savings."

> **Confirm:** how is a "saving" recorded for S6 and G3? This plan logs one `savings_event` per day per basket: (2nd-cheapest − cheapest complete total) when the user views S4.

### Phase 8: Hardening and launch
**Covers:** PRD §12 quality, G1–G3 measurement, deploy
**Definition of Done**
- [ ] Offline: with cached data, S2, S3 and S4 render with the network off; every save is disabled
- [ ] Lighthouse mobile: performance ≥ 80, accessibility ≥ 95; every screen shows content or a skeleton in < 2 s on "Fast 3G"
- [ ] Manual pass at 360 / 768 / 1200px in Chrome, Safari and Edge
- [ ] Contrast check on every badge (D5)
- [ ] Deployed as one Node service (D15): `npm run build`, then `npm start` with `NODE_ENV=production` (Express already serves `client/dist` and falls back to `index.html` for SPA routes); migrations pushed with `npm run db:push`
- [ ] README filled in: live link, test logins, tests, deployment, features table
- [ ] All test-checklist items below ticked

---

## 13. Testing checklist

| ID | Test | Type |
|---|---|---|
| T-US1-1 | Search "White Sugar 2kg" → S2 ordered lowest price first | Manual |
| T-US1-2 | No matches → exact "No products found…" message | Manual + automated (component test) |
| T-US2-1 | Add 3 items → badge increments → S4 totals correct | Manual + automated (`basketTotals`) |
| T-US2-2 | Offline add → "Action failed…" overlay | Manual |
| T-US3-1 | Submit "Long Line" → toast and updated panel | Manual |
| T-US3-2 | 6th queue report in 60 min → BR2 message | Manual + automated (SQL) |
| BR1 | 47 h → no badge; 49 h → badge | Automated (Jest) |
| BR2 | 5 queue OK / 6th blocked; 3 price OK / 4th blocked; window rolls after 60 min | Automated (SQL) |
| BR3 | Missing item store excluded from "Cheapest"; sums only available items; saving R4.00 | Automated (Jest) |
| BR4 | Weights: 0 min = 0.8, 15 min = 0.8, 67.5 min = 0.4, 120 min = 0; no reports → Unknown | Automated (Jest + SQL) |
| Validation | Password rules; price `34.99` valid, `34.999`, `-1`, `abc` invalid | Automated (Jest) |
| Format | `R1,234.50`, `12 Mar 2026`, `14:05` SAST | Automated (Jest) |
| Auth | Lockout after 5; reset link 1 h; unverified cannot write | Manual |
| Edge cases (PRD §6.2) | Missing price, location mismatch, live price update, session expiry mid-edit | Manual |
| Quality (PRD §12.1) | Speed, offline, devices, locale, accessibility | Manual (Phase 8) |

---

## 14. Updates to make in the PRD after you confirm §0
- Add `Suburb`, `Store`, `Basket`, `BasketItem`, `Notification` entities; change `Listing.store_branch_name` → `store_id`; add `ReportLog.store_id`, `is_verified`, `location_mismatch`; replace `User.password_hash` with the Supabase Auth note (D1–D3).
- Add the verification rule as **BR5** (D4).
- Add the amber text colour `#9A5B00` to §9.1 (D5).
- Correct the data region in §12.4 (D6).
- Add US4, US5 with T- criteria (Phases 6–7).
- Add the extra Stitch helper sentences to §12.2 if you keep them.
- Update §11.1 (Express API, Postgres 17, hosting) and §11.6 (folder structure) to match the repo (D14–D16).
- Resolve the US3 vs BR2 report-limit conflict in the PRD text (this plan uses BR2: 5 queue / 3 price reports per store per 60 minutes).
- Add screens A1–A4 to §8.1 and fix "S2 Login" → "A1 Log in" in §6.2 and §12.2.
- Move the test-account passwords out of the PRD before the repository is public.
