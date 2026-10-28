# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Internal Explore Wings staff and the operations team. They sign in at the start of a work session, desktop-first from an office desk, to run the day's work over the company's travel catalogue and the records around it. Phone use is occasional (checking in on the move), not the primary scene.

## Product Purpose

The Explore Wings operations console: the internal ERP where staff manage the company's travel catalogue (resorts and tour packages) and the operational records built on it. Success means a staff member reaches their workspace quickly and trusts that access is secure.

## Positioning

The back office behind the Explore Wings travel brand. The same company that sells curated journeys through its public site runs them from here. There is no external customer in this surface; its value is operational fidelity to the catalogue it governs.

## Operating Context

- Sits behind the public marketing site (`../frontend/`), which is the brand's customer-facing, dark and image-led face.
- Catalogue data lives in a Neon Postgres database (`resorts`, `tour_packages`, `images`) served by the catalogue API (`../nestbackend/`) under the `/rest/v1` prefix.
- The ERP's own auth backend is `../erpnestbackend` (NestJS + Drizzle over the same Neon database), served under `/rest/v1` on port 3001. The frontend targets it through `VITE_API_BASE_URL`.
- Sign-in is the entry point; the operations shell it leads into exists as a template (`src/erplayout/`) ready for real screens.

## Capabilities and Constraints

- Frontend: React 19 + Vite + Tailwind v3. Routing is react-router-dom; `/login` is the sign-in route and `/erp` is the protected console shell.
- Backend: `../erpnestbackend` exposes `GET /rest/v1/health` and `POST /rest/v1/auth/login`. Sign-in is real: it verifies a bcrypt hash and returns a JWT with `{ id, username, email, role }`.
- Data model: a `users` table (Drizzle, `src/schema/users.ts`) — `id`, `username`, `email`, `password_hash`, `role`, `created_at`; `email` and `username` are unique and emails are stored lowercased. Passwords are bcrypt hashes, never plain text.
- A `superadmin` user is seeded (`scripts/seed.ts`); the seed is idempotent and resets that user's password on re-run.
- Sign-in is email + password only. No sign-up in the UI, SSO, magic link, or social providers are established.
- The session token is stored in `localStorage`; it is not yet attached to data requests (there is no guarded endpoint yet).
- Brand assets are shared with the marketing site (`ewlogo.png`); prices are in INR.
- Undecided: token refresh/revocation, role-based permissions, and any password-reset backend.

## Brand Commitments

- Product name "Explore Wings"; tagline "Your Journey, Our Passion".
- Brand colour is red / crimson (marketing uses `#ef4444` and `#dc2626`); the public site is dark, cinematic, and image-led.
- Confirmed for this surface by the user: a quiet, professional, light presentation where the brand shows as the logo and one accent. The dark cinematic treatment belongs to the marketing site, not the internal console.

## Evidence on Hand

- Real brand assets: `../frontend/public/images/ewlogo.png` (logo) and the catalogue imagery on the marketing site.
- A working auth flow and one seeded account (`superadmin` / `infoexplorewings@gmail.com`) back the sign-in surface. No other user records exist; do not present seeded demo data as real operational data.

## Product Principles

- The console serves a working task first; expression stays in precise details, never in the way of the job.
- Trust is the product: signing in must feel secure, legible, and fast.
- Stay recognisably Explore Wings (name, crimson, warmth) even while quiet.
- Match the marketing brand's craft without importing its dark, cinematic staging.

## Accessibility & Inclusion

No product-specific standard was established. The surface follows WCAG AA for contrast, focus visibility, and keyboard operation as a floor.
