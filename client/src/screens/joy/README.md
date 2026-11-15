# Joy's screens

**Your Issues:** **#19 F4 Suburb Filter Settings** (this folder)
**Due:** Checkpoint 3, **Mon 16 Nov 10:00**.
**Read first:** [the team workflow](../README.md) | Issue #19 | docs/IMPLEMENTATION_PLAN.md

## What you're building
**Suburb selector on S1 (/).** The shopper picks or clears their local South African suburb (e.g. Hatfield, Arcadia, Benoni) on the Home screen, persists the selection, and passes ?suburb=<uuid> into S2 Search Results (/search?q=...&suburb=<uuid>).

## Files created
- client/src/screens/joy/README.md
- client/src/screens/joy/SuburbSelector.jsx
- client/src/screens/joy/useSuburbs.js
- client/src/screens/joy/__tests__/SuburbSelector.test.jsx

## Done when
- [x] Shopper can view all available suburbs from Supabase (suburbs table)
- [x] Selecting a suburb saves the preference and attaches suburb=<uuid> to URL search params
- [x] Clearing the suburb resets the filter back to all suburbs
- [x] Matches Stitch designs at 360px and 1200px
- [ ] A teammate approved with a comment, and they merged it

## Talk to
- **Mpho:** S2 Search Results (useSearch.js) reads suburb from the URL (/search?q=...&suburb=<uuid>) to filter search results.
