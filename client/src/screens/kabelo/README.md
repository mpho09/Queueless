# Kabelo's screens

**Your Issues:** **#14 Accounts end-to-end** (first: due Checkpoint 3, **Mon 16 Nov 10:00**) · **#12 Store Details end-to-end** (Final, Fri 20 Nov)
**Read first:** [the team workflow](../README.md) · Issues #14 and #12 · `docs/IMPLEMENTATION_PLAN.md` §7 and Phases 2–3

## 🎯 What you're building
| Screen | Route | Issue | Stitch boards |
|---|---|---|---|
| A1 Log in | `/login` | #14 | `docs/designs/queueless_account_screens_a1_a4/` · `..._desktop_a1_a4/` · `..._states_variations/` |
| A2 Sign up | `/signup` | #14 | same |
| A3 Forgot password | `/forgot-password` | #14 | same |
| Reset password | `/reset-password` | #14 | same |
| A4 Verify email | `/verify-email` | #14 | same |
| Privacy notice | `/privacy` | #14 | — |
| S3 Store Details | `/stores/:storeId` | #12 | `docs/designs/queueless_s3_store_details/` · `..._desktop_1200px/` · `..._states/` |

**Log-in is what the markers test first on Monday**, so do #14 first.

## 📂 Files you'll create
```
client/src/screens/kabelo/
├── Login.jsx  Signup.jsx  ForgotPassword.jsx  ResetPassword.jsx  VerifyEmail.jsx  Privacy.jsx
├── StoreDetails.jsx           S3 page (#12)
├── QueuePanel.jsx             S3 queue panel (#12)
├── useStore.js                S3 data hook (#12)
└── __tests__/

shared, because other screens use them:
client/src/hooks/useAuth.js                 current user, log in / out, session
client/src/components/ui/PasswordField.jsx  show/hide password
client/src/components/ui/Checkbox.jsx
client/src/utils/validation.js              password rules (Elias adds price rules here too)
client/src/utils/queueDecay.js              (#12)

backend:
server/src/middleware/requireUser.js        checks the log-in token on API calls
server/scripts/seed-users.js                test accounts
supabase/migrations/<timestamp>_profiles_trigger.sql
supabase/migrations/<timestamp>_queue_view.sql      (#12)
```

## ✅ Already built, reuse these
- Routes for all your pages already exist in `App.jsx` (showing "Coming soon"). Just swap them
- `Button`, `Card`, `EmptyState`, `ErrorState`, `Toast`
- `QueueBadge` (for S3) and `AddToBasketButton` (for the S3 price list)
- `messages.loginFailed`, `messages.accountLocked`, `messages.passwordRules`, `messages.sessionExpired` in `lib/messages.js`

## 🛠️ Step by step: #14 Accounts

### Step 1: Auth settings (backend)
- Ask Mpho for access to the hosted Supabase project
- Turn on **email confirmation**, set the password rules and a **1-hour** reset link. Set them in `supabase/config.toml` (local) **and** in the dashboard (Authentication → Providers / Policies)
- With Elias: add the Vercel live link under Authentication → URL Configuration (Site URL + redirect URLs)

### Step 2: Profile for every new user (backend)
```bash
npm run db:migration -- profiles_trigger
```
A trigger on `auth.users` that inserts a `profiles` row (role `Shopper`) when someone signs up. Test: sign up → a profile row exists.

### Step 3: `requireUser` middleware (backend)
`server/src/middleware/requireUser.js`: read `Authorization: Bearer <token>`, check it with `supabase.auth.getUser(token)`, put the user on `req.user`, otherwise return **401**. Test it with `supertest`. **Joy and Refilwe need this for their routes.** Tell them when it's merged.

### Step 4: Test accounts (backend)
`server/scripts/seed-users.js` creates a Shopper, a Retailer and a developer account with **test passwords only**. Add them to the README **Test Logins** table.

### Step 5: `useAuth` + form pieces (frontend)
- `hooks/useAuth.js`: `user`, `signUp`, `logIn`, `logOut`, `resetPassword`, using `supabase.auth`
- `PasswordField` (show/hide), `Checkbox`
- `utils/validation.js`: password must include **1 uppercase letter and 1 number**. Unit-test it first

### Step 6: The screens (frontend)
1. **Sign up (A2):** email, password, **two consent checkboxes** (both required). A weak password shows `messages.passwordRules` and **keeps what they typed**
2. **Log in (A1):** wrong details → `messages.loginFailed`; 5 wrong tries → `messages.accountLocked`
3. **Verify email (A4):** shown after sign-up and to unverified users
4. **Forgot / Reset password:** send the email; the reset page sets a new password
5. **Privacy:** the privacy notice text from the PRD
6. **Header:** "Log in" for guests, the account menu when logged in
7. Desktop: forms in a centred **440px** card

### Step 7: Connect the routes
```jsx
import Login from './screens/kabelo/Login.jsx'
<Route path="login" element={<Login />} />
// …same for signup, forgot-password, reset-password, verify-email, privacy
```

### Step 8: Test, compare, PR
- Tests: validation rules, sign-up needs both checkboxes, wrong password message, `requireUser` 401
- **Try it for real on the live link:** sign up with your email, verify, log in, log out
- Split into 2 PRs if it's big: **backend** (steps 1–4) then **screens** (5–7)

## 🛠️ Step by step: #12 Store Details (after #14)
1. **Database view:** `npm run db:migration -- queue_view` creates `store_queue_status(store_id, level)`. `level` must be one of `none`, `short`, `moderate`, `long`, `unknown`, because `QueueBadge` and `data.js` already use these. Newer reports count more: 0 min = 0.8, 15 min = 0.8, 67.5 min = 0.4, 120 min = 0; no recent reports → `unknown`
2. **`utils/queueDecay.js`:** the same maths in JavaScript, unit-tested with those four numbers
3. **`useStore.js`:** the store, its prices and its queue level
4. **`StoreDetails.jsx` + `QueuePanel.jsx`:** store info, `QueuePanel` (uses `QueueBadge`), price list with `AddToBasketButton`, and a **"Report Queue Status"** button to `/stores/:storeId/report` (Elias's screen). Guests get the log-in sheet instead
5. Route: `<Route path="stores/:storeId" element={<StoreDetails />} />`

## 🏁 Done when
**#14**
- [ ] Sign up → verification email → log in → log out works **on the live link**
- [ ] Both checkboxes required; weak password message keeps the typed text
- [ ] Wrong password and lockout messages show
- [ ] Reset link works and expires after 1 hour
- [ ] `requireUser` returns 401 without a token (tested); Test Logins in the README

**#12**
- [ ] Tapping a store on S1, S2 or S4 opens S3
- [ ] Queue panel shows the level; no recent reports → **Unknown**
- [ ] `queueDecay` tests pass for 0 / 15 / 67.5 / 120 min

**Both:** match Stitch at 360px and 1200px · a teammate approved with a comment, and **they** merged it

## 🤝 Talk to
- **Mpho:** Supabase dashboard access and the `profiles` table (#8)
- **Elias:** redirect URLs for the live link (#15); he adds price rules to `validation.js`, so agree who edits it when
- **Joy and Refilwe:** tell them when `requireUser` is merged
