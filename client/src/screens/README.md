# Screens by team member

Each person builds their screens inside their own folder, so two people (or two AI agents) never edit the same files at the same time.

| Folder | Owner | Screens | Issues |
|---|---|---|---|
| [mpho/](mpho/) | Mpho (@mpho09) | S2 Search Results | #11 |
| [joy/](joy/) | Joy (@jjmolomo17-tech) | Suburb selector on S1 | #19 |
| [refilwe/](refilwe/) | Refilwe (@Ref-DevSa) | S4 Basket, S6 Savings | #16, #20 |
| [kabelo/](kabelo/) | Kabelo (@kabelomathapo6-lab) | A1–A4 Accounts, S3 Store Details | #14, #12 |
| [elias/](elias/) | Elias (@eliasmtisie4321) | S5 Report Submission | #18 |

## Rules
- **Your screens go in your folder.** Put the page and any components only that page uses here, e.g. `screens/mpho/SearchResults.jsx`.
- **Shared code stays where it is.** Anything two or more screens use goes in `components/`, `hooks/`, `lib/` or `utils/`. Tell the team in your PR when you add or change something shared.
- **Hooking up a route:** import your page in `client/src/App.jsx` and replace its `ComingSoon` route. That's the only shared file you should need to touch, so keep that change small.
- **Tests** for your screen go next to it: `screens/<you>/__tests__/`.
- **Existing pages stay put for now:** `pages/Home.jsx` and `pages/Basket.jsx` are already merged and working; don't move them in a feature PR.
