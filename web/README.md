# StateOfFinances — Dashboard (Phase 2)

Read-only mobile-first dashboard over the Phase 1 backend's Postgres data. Next.js 14
(App Router), TypeScript, Tailwind, Auth.js v5 (magic-link via Resend), single allowed
email — see the root [`README.md`](../README.md) for how this fits into the whole
project (bot, n8n workflows, OpenClaw skill).

## Local dev setup

```bash
cd web
npm install
cp .env.example .env.local   # fill in real values, see below
npm run dev                  # http://localhost:3000
```

## Env vars

| Var | What it is |
|---|---|
| `DATABASE_URL` | Postgres connection string for `budget_tracker` |
| `AUTH_SECRET` | `openssl rand -base64 32` — encrypts the session JWT |
| `NEXTAUTH_URL` | The public URL this app is served at (needed for magic-link callback URLs) |
| `RESEND_API_KEY` | From resend.com, free tier is enough |
| `EMAIL_FROM` | Sender address for magic-link emails (Resend's `onboarding@resend.dev` works with no domain setup) |
| `ALLOWED_EMAIL` | The only email allowed to sign in — everything else is rejected in the `signIn` callback |

Auth tables (`users`, `accounts`, `sessions`, `verification_token`) are the standard
`@auth/pg-adapter` schema, applied via `../migrations/003_auth.sql`.

## Architecture notes

- **Auth is split into two configs** (`lib/auth.config.ts` + `lib/auth.ts`) because the
  Postgres adapter (`pg`) can't run in Next's Edge middleware runtime. Middleware uses
  the Edge-safe config (JWT session strategy, no adapter, no providers — providers
  force an adapter requirement even just to construct the NextAuth instance) purely to
  check `authorized()` and redirect to `/signin`. Route handlers and server components
  use the full config with the adapter for the actual sign-in flow.
- **`pg` returns `DATE` columns as JS `Date` objects**, not `"YYYY-MM-DD"` strings —
  normalized once in `lib/queries.ts` (`toDateOnlyString`), not left for callers to
  trip over.
- **Currency formatting** is centralized in `lib/formatCurrency.ts` — never inline
  `toLocaleString` in a component.
- **Category colors** cycle a fixed 4-color palette by sorted position
  (`lib/categoryColors.ts`), so the same category gets the same color across the donut,
  the list, and the transactions page.
- **Odometer effect** (`components/OdometerNumber.tsx`) is a pure-CSS technique: each
  digit is a 0–9 strip inside a 1-line-height clipped container, `translateY`'d to the
  target digit and CSS-transitioned. Sliding across intermediate digits gives the
  rolling look with no JS animation loop. Respects `prefers-reduced-motion` via
  `motion-reduce:transition-none`.
- **Time-range pills** don't do client-side fetching — they push a `?range=` query
  param and the whole (server-rendered) page re-fetches. Simpler than client state, and
  the odometer still animates smoothly across the navigation since React reconciles the
  same DOM nodes at the same route.

## Docker

Built via the multi-stage `Dockerfile` (Next's `output: "standalone"`) and run as the
`budget-web` service in `~/n8n-automation/docker-compose.yml`, alongside `budget-db`
(same Postgres instance Phase 1 uses) — joins the same compose network, reachable as
`budget-db:5432`.

```bash
cd ~/n8n-automation
docker compose build budget-web
docker compose up -d budget-web
```

Published on `127.0.0.1:3050` only (not exposed on the LAN) — public access is via a
**Tailscale Funnel on port 8443** (`tailscale funnel --https=8443 --bg 3050`), kept
separate from n8n's own Funnel on port 443 so the two don't collide.
