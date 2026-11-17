# Design refresh: "Midnight Lagoon"

**Owner:** Kabelo (Designer) · **Scope:** visual layer only. No logic, routes, data or copy (except one supporting line on Home) were changed. All 147 tests pass and `npm run build` succeeds (checked after merging main on 17 Nov).

## What changed and why

| Area | Before | Now |
|---|---|---|
| Mood | White, clean, utilitarian | Deep teal-ink canvas, frosted glass, one luminous accent. Premium and calm, readable at a glance |
| Brand colour | Teal `#0B7A6B` | Luminous aqua `#52DCC4` (same family, now glows on dark) |
| Winner | Green outline on the cheapest store | Champagne-gold edge and glow on the cheapest store, the one memorable moment |
| Money saved | Green | Mint `#86E8B0`, used only for savings |
| Type | Inter | Sora (headings, prices) and Manrope (body, controls) |
| Shapes | 8 / 6 / 24 px | Cards 20, fields 14, panels 28, capsule buttons |
| Mobile nav | Flat bar | Floating capsule tab bar |
| Logo | Text only | Ring with a dot slipping out of the line (the queue you skip) |

Design rule of thumb: **gold = the best option, mint = money saved, aqua = action.**

## How it was done (merge-friendly)

Token **names were kept**, so most screens re-themed with no edits. The work is mostly in `client/src/index.css`, the shared `components/`, and class names on a few screens.

Because the theme is now dark, a few class meanings flipped. Rules for everyone from now on:

- Text on a `bg-primary` button is `text-on-primary`, not `text-white`.
- Cards use `bg-surface` (or the `Card` component), not `bg-bg`.
- Hover backgrounds use `hover:bg-surface-raised`.
- Form fields use `border-border-strong` and `bg-surface`.
- Headings (`h1`–`h3`) get Sora automatically. Put `font-display tabular-nums` on prices.

## Files changed

**Shared (everyone's screens are affected, please look at them):**
`index.css`, `index.html`, `components/ui/{Button,Card,QuantityStepper,SearchField,Select}.jsx`, `components/layout/{AppShell,BottomTabBar,DesktopNav,Footer,GlobalHeader}.jsx`, new `components/layout/Logo.jsx`, `components/domain/{CheapestPill,StoreComparisonCard}.jsx`, `components/feedback/{EmptyState,ErrorState,OfflineBanner,Skeleton,Toast}.jsx`

**Pages:** `pages/{Home,Basket,ComingSoon,NotFound}.jsx`

**Restyled after merge (class names only):** Mpho's `screens/mpho/StorePriceRow.jsx` (S2) and Elias's `screens/elias/{QueueTile,ReportSubmission}.jsx` (S5), including a `text-white` on the aqua check mark that failed contrast.

**Refilwe's S6 files (class names only, no logic):** `screens/refilwe/{Dialog,SavingsSummary,SavingsChart,ProfileCard,AccountSettings,Savings,RecentActivity}.jsx`

**Docs:** `docs/PRD.md` §9.1, `docs/IMPLEMENTATION_PLAN.md` §9.1, `docs/screenshots/`

Not touched: Joy's `SuburbSelector` (it inherits the new `Select`), all hooks, lib, server, Supabase.

## Accessibility check

All text and background pairs meet WCAG AA 4.5:1. Form-field borders meet 3:1.

| Pair | Ratio |
|---|---|
| Text on canvas / card | 16.6 / 14.2 |
| Muted text on canvas / card / raised | 8.4 / 7.2 / 6.0 |
| Aqua on canvas | 10.9 |
| Button text on aqua | 10.0 |
| Mint on card | 10.6 |
| Gold on card | 9.7 |
| Amber text on its tint | 9.0 |
| Red text on its tint | 7.1 |
| Field border on card | 3.3 |

Visible focus ring on every control, and animations switch off under `prefers-reduced-motion`.

## Known follow-ups

- The original Stitch boards in `docs/designs/` are kept unchanged as the design baseline. Nothing in that folder was edited or removed.
- The Stitch boards in `docs/designs/` still show the old light theme. Regenerate them from the new tokens, or treat `docs/screenshots/` as the reference.
- Dark only for now. A light variant is a token override away if the team wants one for daylight use in stores.
- Login, Sign up and Store Details (#14, #12) are not built yet. They will pick up this look automatically from the shared components.
