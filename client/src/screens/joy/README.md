# Joy's screens

**Your Issues:** **#19 F4 Suburb Filter Settings**
**Due:** Checkpoint 3, **Mon 16 Nov 10:00**.
**Read first:** [the team workflow](../README.md) · Issue #19 · `docs/IMPLEMENTATION_PLAN.md`

## What you're building
**Suburb selector on S1 (`/`).** Built on the shared `Select` component, `useSuburb` hook (`queueless.suburbId` + `profiles.suburb_id` sync for signed-in users), and Stitch design tokens. Includes a Clear button and `Showing stores in {suburb}` status text.

## Files updated
- `client/src/screens/joy/SuburbSelector.jsx`
- `client/src/screens/joy/__tests__/SuburbSelector.test.jsx`
- `client/src/hooks/useSuburb.js`
- `client/src/pages/Home.jsx`

## Done when
- [x] Uses existing `useSuburb` hook (`queueless.suburbId`) and `Select` component
- [x] Syncs `profiles.suburb_id` for logged-in users
- [x] Adds Clear option and `Showing stores in {suburb}` status on Home
- [x] Uses Stitch design tokens (`border-border`, `bg-surface-soft`, `rounded-card`, `text-muted`)
- [x] All Jest tests pass (`npm test`)
