# Joy's screens

**Your Issue:** **#19 F4 Suburb filter end-to-end**
**Due:** **PR 1 before Checkpoint 3 (Mon 16 Nov 10:00)**, PR 2 after log-in (#14) is merged
**Read first:** [the team workflow](../README.md) · Issue #19

## 🎯 What you're building
The **suburb dropdown on the Home screen (S1)**. The shopper picks their suburb and only sees stores near them, and the app remembers the choice.

**Good news:** a basic version already works inside `client/src/pages/Home.jsx` (the `suburbSelect` block, plus the "Showing stores in …" text). Your job is to:
1. **Move it into its own component** in your folder
2. Load the suburbs from **your own API route** instead of straight from the database
3. Add a **Clear** option
4. (PR 2) **Save the choice to the user's profile** when they're logged in

| Screen | Where it shows | Stitch boards |
|---|---|---|
| Suburb selector | S1 Home, `/` | `docs/designs/queueless_s1_home_search_landing/` · `..._desktop_1200px/` · `..._states/` |

## 📂 Files you'll create or change
```
client/src/screens/joy/
├── SuburbSelector.jsx                   NEW: the dropdown + Clear
└── __tests__/SuburbSelector.test.jsx    NEW

client/src/pages/Home.jsx                CHANGE: use <SuburbSelector /> instead of the inline block
client/src/lib/data.js                   CHANGE: fetchSuburbs() calls your API
client/src/hooks/useSuburb.js            CHANGE (PR 2): save to the profile when logged in

server/src/routes/suburbs.js             NEW: GET /api/suburbs
server/src/routes/me.js                  NEW (PR 2): PUT /api/me/suburb
server/src/app.js                        CHANGE: register your routes (this file comes from Elias's #15)
server/tests/suburbs.test.js             NEW
```

## ✅ Already built, reuse these
- `Select` (`components/ui/Select.jsx`): the dropdown itself
- `useSuburb()` (`hooks/useSuburb.js`): returns `[suburbId, setSuburbId]` and already saves to `localStorage`
- `api()` (`lib/api.js`): call it as `api('/suburbs')`; it adds the log-in token for you
- `fetchSuburbs()` (`lib/data.js`): what Home calls today

## 🛠️ Step by step

### PR 1: suburbs from the API + Clear (before Monday)

**Step 1: Backend route**
Wait for Elias's #15 (it creates `server/src/app.js`) and Mpho's #8 (the `suburbs` table). Then create `server/src/routes/suburbs.js`:
```js
import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

router.get('/', async (_req, res) => {
  const { data, error } = await supabase.from('suburbs').select('id, name, city').order('name')
  if (error) return res.status(500).json({ error: 'Something went wrong. Try again.' })
  res.json(data)
})

export default router
```
Register it in `server/src/app.js`:
```js
import suburbs from './routes/suburbs.js'
app.use('/api/suburbs', suburbs)
```
Test it with `supertest` (mock the Supabase call): `GET /api/suburbs` → 200 and a list. Try it in the browser: http://localhost:3001/api/suburbs

**Step 2: Point the client at it**
In `lib/data.js`, make `fetchSuburbs()` return `api('/suburbs')`. Keep the sample-data fallback for local development.

**Step 3: Your component**
Move the `suburbSelect` block out of `pages/Home.jsx` into `screens/joy/SuburbSelector.jsx`:
- Uses `Select` and `useSuburb()`
- Lists suburbs from `fetchSuburbs()` (React Query `useQuery`)
- Has a **Clear** option ("All suburbs") that calls `setSuburbId(null)`
- Shows "Showing stores in {suburb}"

Then in `Home.jsx`, replace the inline block with `<SuburbSelector />`. **Keep that change small:** Home is Refilwe's file.

**Step 4: Test**
`SuburbSelector.test.jsx`: choosing a suburb updates "Showing stores in …"; Clear goes back to all suburbs. Run `npm test`.

**Step 5: PR**
`feat: load suburbs from API and add Clear option (#19)`. Write **"Part of #19"**, not "Closes" (PR 2 finishes it).

### PR 2: remember the suburb for logged-in users (after #14)

**Step 6: Backend**
In `server/src/routes/me.js`, add `PUT /api/me/suburb`, protected by Kabelo's `requireUser` middleware. It saves `suburb_id` on **the logged-in user's own** profile. Test: without a token → 401; with a token → 200.

**Step 7: Frontend**
In `useSuburb.js`: logged in → load the suburb from the profile and save with `api('/me/suburb', { method: 'PUT', body: { suburbId } })`; guest → keep using `localStorage`.

**Step 8: PR**
`feat: save suburb to profile for logged-in users (#19)` with **`Closes #19`**.

## 🏁 Done when
- [ ] The S1 dropdown lists suburbs from the API (http://localhost:3001/api/suburbs works)
- [ ] Choosing a suburb filters the stores and updates "Showing stores in {suburb}"
- [ ] A refresh keeps the choice; Clear removes it
- [ ] (PR 2) Log in on another browser → the same suburb is chosen
- [ ] Route tests and the component test pass; works on the live link
- [ ] Each PR approved by a teammate with a comment, and **they** merged it

## 🤝 Talk to
- **Elias:** when `server/src/app.js` (#15) is merged
- **Mpho:** when the `suburbs` table (#8) is live
- **Kabelo:** for `requireUser` (#14), needed for PR 2
- **Refilwe:** before changing `pages/Home.jsx`
