# Screens by team member

Each person builds their screens inside **their own folder**, so two people (or two AI agents) never edit the same files at the same time. Open your folder's README for **your** step-by-step guide.

| Folder | Owner | Screens | Issues |
|---|---|---|---|
| [mpho/](mpho/) | Mpho (@mpho09) | S2 Search Results | #11 |
| [joy/](joy/) | Joy (@jjmolomo17-tech) | Suburb selector on S1 | #19 |
| [refilwe/](refilwe/) | Refilwe (@Ref-DevSa) | S4 Basket, S6 Savings | #16, #20 |
| [kabelo/](kabelo/) | Kabelo (@kabelomathapo6-lab) | A1–A4 Accounts, S3 Store Details | #14, #12 |
| [elias/](elias/) | Elias (@eliasmtisie4321) | S5 Report Submission | #18 |

---

## 📁 Where things go

| What | Where | Example |
|---|---|---|
| Your page (a whole screen) | `client/src/screens/<you>/` | `screens/mpho/SearchResults.jsx` |
| A component **only your screen** uses | `client/src/screens/<you>/` | `screens/elias/QueueTile.jsx` |
| Tests for your screen | `client/src/screens/<you>/__tests__/` | `screens/mpho/__tests__/SearchResults.test.jsx` |
| Anything **two or more** screens use | `components/`, `hooks/`, `lib/`, `utils/` | `components/domain/QueueBadge.jsx` |
| Server routes | `server/src/routes/` | `server/src/routes/suburbs.js` |
| Database changes | `supabase/migrations/` (new file, never edit an old one) | `npm run db:migration -- search` |

**Already built and shared. Reuse these, don't rebuild them:**
- **Layout:** `AppShell` (header, tab bar, desktop nav, footer) wraps every page automatically
- **UI:** `Button`, `Card`, `Select`, `SearchField`, `QuantityStepper` (`components/ui/`)
- **States:** `EmptyState`, `ErrorState`, `Skeleton` / `SkeletonRows`, `OfflineBanner`, `Toast` (`components/feedback/`)
- **Domain:** `QueueBadge`, `CheapestPill`, `MissingItemsPill`, `StoreComparisonCard`, `AddToBasketButton` (`components/domain/`)
- **Hooks:** `useOnline`, `useSuburb`, `useBasket`, `useBasketCount` (`hooks/`)
- **Helpers:** `api()` for our Express API (`lib/api.js`), `supabase` client (`lib/supabase.js`), `formatZAR` / dates (`lib/format.js`), **every error message** (`lib/messages.js`; never retype a message)

If you change a shared file, say so in your PR description so the reviewer checks the other screens still work.

---

## 🔁 How to work (every Issue, every day)

### 1. Start
```bash
git switch main
git pull                     # always start from the latest main
npm install                  # in case someone added a package
git switch -c feature/<issue-number>-<short-name>    # e.g. feature/11-search-results
```
On the [board](https://github.com/users/mpho09/projects/1), move your Issue to **In Progress**.

### 2. Run the app
```bash
npm run dev                  # client http://localhost:5173 · API http://localhost:3001
```
Until the database (#8) is live, the app uses sample data from `lib/sampleData.js`. That's fine for building screens.

### 3. Build: tests first
1. Write a test that describes what the screen should do (it fails)
2. Write the code until the test passes
3. Run everything:
```bash
npm test                     # all tests
npm run build                # must build with no errors
npm run lint                 # once #10 is merged
npm run typecheck            # once #10 is merged
```

### 4. Connect your page to its route
Open `client/src/App.jsx`, import your page and replace its `ComingSoon` line, e.g.:
```jsx
import SearchResults from './screens/mpho/SearchResults.jsx'
// ...
<Route path="search" element={<SearchResults />} />
```
That's the only shared file most people need to touch. Keep this change tiny so it doesn't clash with others.

### 5. Check against the Stitch design
1. Open your board's `screen.png` in `docs/designs/` (the folder names are in your README)
2. In Chrome press **F12**, then **Ctrl+Shift+M**, and set the width to **360** (mobile), then **1200** (desktop)
3. Compare layout, spacing, colours, text and icons. Also check the `_states` board: Loading, Empty, Error, Offline
4. Take screenshots of both widths for your PR

### 6. Commit small, push often
```bash
git add <files>
git commit -m "feat: add search results list (#11)"
git push -u origin feature/11-search-results    # first push; after that just: git push
```
Use `feat:` for features, `fix:` for bug fixes, `test:` for tests only, `docs:` for docs. Always put the Issue number at the end.

### 7. Open a pull request (from your own account)
- Title: what it does, e.g. `feat: add Search Results screen S2 (#11)`
- Description: **what changed and why**, `Closes #11`, **how you tested it**, screenshots at 360px and 1200px
- Ask your AI to review it first, then request **one teammate** as reviewer
- Move your card to **In Review**

### 8. Review and merge (no self-merging)
- The reviewer pulls your branch (`gh pr checkout <number>`) or opens the Vercel preview link, tries it, and **approves with a comment saying what they checked**
- **The reviewer merges** (Squash and merge) and deletes the branch. Never approve or merge your own PR
- After the merge, check your change on the live link and move the card to **Done**

### 🧪 Test template for a screen
```jsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MyScreen from '../MyScreen.jsx'

function renderScreen(path = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="*" element={<MyScreen />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

test('shows the page title', async () => {
  renderScreen()
  expect(await screen.findByRole('heading', { name: /my screen/i })).toBeInTheDocument()
})
```
Supabase is replaced by a stub in tests automatically (`src/__mocks__/supabase.js`). See `src/__tests__/Home.test.jsx` and `Basket.test.jsx` for full examples.

### 🆘 Stuck?
Post in the team thread: **what you're trying to do, what you tried, and the exact error**. Don't sit on a blocker for more than an hour.
