Original prompt: for the store, i want both types of transactions, however we need to make it work, make it work and then commit and push to git repo

- Added live storefront and season-pass checkout via Supabase edge functions and PayPal.
- Current task: expand the playable puzzle pool by 10-15 new types, including chess scenarios, and push to main.
- Plan: add deterministic multi-choice puzzle families first so backend validation and frontend boards stay aligned.
- Added 12 new puzzle types centered on logic, trivia, geography, science, math, vocabulary, and three extra chess categories.
- Validation status: `npm run build` and `npm run build:server` both pass after the expansion.
- Browser smoke attempt was blocked by an unstable preview process in this shell; fallback validation was the full production build.
