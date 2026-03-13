Original prompt: for the store, i want both types of transactions, however we need to make it work, make it work and then commit and push to git repo

- Added live storefront and season-pass checkout via Supabase edge functions and PayPal.
- Current task: expand the playable puzzle pool by 10-15 new types, including chess scenarios, and push to main.
- Plan: add deterministic multi-choice puzzle families first so backend validation and frontend boards stay aligned.
- Added 12 new puzzle types centered on logic, trivia, geography, science, math, vocabulary, and three extra chess categories.
- Validation status: `npm run build` and `npm run build:server` both pass after the expansion.
- Browser smoke attempt was blocked by an unstable preview process in this shell; fallback validation was the full production build.
- Current task: replace OTP-only auth with real email/password login, security-question recovery, and real provider link state for Facebook/TikTok.
- Added migration `20260312000007_auth_security_and_profile_bootstrap.sql` for owner profile bootstrap inserts and `user_security_questions`.
- Added Supabase edge functions for `set-security-questions`, `get-security-questions`, and `reset-password-with-security-questions`.
- Auth provider and profile UI are mid-refactor; next step is to compile/fix types and smoke-test the new account flow.
- `npm run build` and `npm run build:server` now pass with the auth refactor.
- Browser smoke fallback used local Playwright instead of the bundled skill client because the client could not resolve `playwright` from its own install path in this shell.
- Smoke result: `/profile` renders, no console errors, and the new signup/login/security-question UI is visible.
- Fixed a stale-auth bug in `saveProfile` so the first save immediately after signup/login uses the authenticated session instead of the previous guest snapshot.
- Corrected a migration version collision: auth/security bootstrap is now `20260312000008_auth_security_and_profile_bootstrap.sql` because `20260312000007` is already used by storefront/entitlements on the remote.
