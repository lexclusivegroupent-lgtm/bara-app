# Bära — launch guide (B2B dispatch model)

Source branch: `almi-ready`. This is the branch CI builds and Railway deploys
from (`.github/workflows/build-bara.yml`, `.github/workflows/deploy-railway.yml`,
both trigger on `push: branches: [almi-ready]`). Do not resurrect the old
`main` branch's open-marketplace/demo code — it predates this model and the
security hardening pass.

## What Bära is

Bära is a B2B dispatch/booking layer between companies:

- **Shipper** — a business that needs local extra transport: a store, a
  warehouse, a wholesaler. Submits a request ("Skicka transportförfrågan")
  with pickup/dropoff, goods description, time window, and its own company
  contact details.
- **Carrier** — a verified transport company (åkeri). Only the carrier's
  company account (`partnerRole: "admin"`, the default) can accept, decline,
  or mark a request as contacted. After accepting, the company may assign
  the job internally to one of its own staff (`partnerRole: "worker"`,
  `jobs.assignedWorkerId`).
- **Worker** — staff of a carrier company. Sees only jobs assigned to them
  by their own company, can mark arrival/start/upload photos/complete, and
  never appears in DAC7 earnings or payment notifications — those always
  go to the carrier company account.
- **Bära** — the intermediary. It routes requests and takes no other role.

**What Bära is not:**
- Not a transporter — it never takes possession of goods.
- Not an employer — carrier companies employ their own drivers.
- Not an insurer — cargo/vehicle/liability insurance is the carrier's.
- Not an open gig marketplace — there is no public feed where an
  individual can grab a job for extra personal cash, and no public
  self-registration into a carrier or worker role.

Required liability language (Swedish, appears in the app and admin
dashboard — see `carrier-terms.tsx`, `shipper-terms.tsx`,
`(customer)/post-job.tsx`, `admin-html.ts`):

> Bära förmedlar uppdrag mellan företag.
> Utförande åkeri ansvarar för fordon, förare, försäkring och gods under transport.
> Bära är inte arbetsgivare och inte transportör.

All terms placeholders are stamped **LEGAL REVIEW NEEDED** — they are
short, directionally correct placeholders, not a lawyer-reviewed contract.

## Launch method

Manual, no ads, no auto-matching:

1. Bära admin (`/admin` dashboard, key-gated via `BARA_ADMIN_KEY`) onboards
   carrier companies: `POST /admin/partners` (company name, org number,
   service areas/categories, insurance self-report). There is no public
   carrier signup — `POST /auth/register` rejects `role: "partner"`.
2. A shipper submits a request from the app (public self-registration is
   customer-only while `LEAD_GEN_MODE=true`).
3. Admin manually assigns the request to a carrier company
   (`POST /admin/requests/:id/assign`) — never to an individual unattached
   driver. The Requests tab shows "Bära förmedlar. Åkeriet utför och
   ansvarar." as a standing reminder.
4. The carrier's admin account accepts/declines/marks contacted from the
   Leads screen (`(driver)/leads.tsx`), optionally assigns the job to one
   of its own staff (`POST /jobs/:id/assign-worker`; staff accounts are
   created by admin via `POST /admin/partners/:id/workers`).
5. Photo-gated completion as before (pickup + dropoff photos required).

Pricing: the existing 99–299 SEK engine is kept as-is for launch (see the
`TODO(B2B pricing)` comment in `artifacts/bara/constants/config.ts` and
`artifacts/api-server/src/routes/jobs.ts`). It was designed for small
consumer pickups, not commercial freight — for shipments where it clearly
doesn't fit, the plan is a manual quote from Bära admin or the carrier
directly, not an automatic price. No freight tariff engine has been built.

### Green/pooling (informational only)

A shipper can check "Det går bra att samlasta med annan körning om det
passar tid och riktning" when submitting a request (`jobs.poolAllowed`,
defaults to `true`). The flag is shown to Bära admin (Requests tab) and to
the assigned carrier (Leads screen) — it changes no behavior on its own.
Admin-facing conservative copy: "Färre tomma bilar. När det går slår vi
ihop körningar åt samma håll." Admin has a manual note only: "Överväg
samma åkeri om två jobb ligger nära i tid och geografi." There is
deliberately **no CO2 calculator, no auto-routing/matching, and no
climate-neutral claim** — pooling, if it happens, is a human carrier
decision.

## Running locally

```bash
pnpm install
cp artifacts/api-server/.env.example artifacts/api-server/.env   # if present, else set vars below
pnpm --filter @workspace/api-server dev      # API on the configured port
pnpm --filter @workspace/bara dev            # Expo dev server (web/iOS/Android)
```

Database: schema-only, no versioned migrations. `drizzle-kit push --force`
runs automatically on every API server boot (see `index.ts`) against
`DATABASE_URL`. There is no `pnpm migrate` step and no migrations folder to
maintain — schema changes in `lib/db/src/schema/` take effect on next boot.

There is no automated test suite (`pnpm test` is not wired up). Verify
changes by running the API server against a real Postgres instance and
exercising the flows by hand (or via `curl`/the admin dashboard).

### Required environment variables (API server)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Auth token signing |
| `ENCRYPTION_KEY` | AES-256-GCM key for personnummer/bank account at rest |
| `BARA_ADMIN_KEY` | Admin dashboard / `/admin/*` API key |
| `MAPBOX_SECRET_TOKEN` | Geocoding — required in production (`app.ts` fails fast without it) |
| `CORS_ORIGIN` | Allowed origin(s) for the web app |
| `LEAD_GEN_MODE` | Feature flag, default `true`. Keep `true` for this model — do not reintroduce the open marketplace / lowered rate limits from the old demo. |

Optional (features degrade gracefully without them):

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Transactional email (OTP, receipts, partner-lead emails) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Photo uploads |
| `ADMIN_STATS_KEY` | Separate key for read-only stats endpoints, if used |
| `ALERT_WEBHOOK_URL` | Ops alerting |
| `APP_BASE_URL` | Used to build links in emails |
| `LOG_LEVEL`, `NODE_ENV` | Standard runtime config |

### Frontend (`artifacts/bara`)

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_DOMAIN` | API origin the app talks to (defaults to `app.baraapp.se`) |
| `EXPO_PUBLIC_LEAD_GEN_MODE` | Mirrors the backend flag, default `true` |
| `EXPO_PUBLIC_MAPBOX_TOKEN` | Client-side map rendering |

Public marketing/web domain: `https://baraapp.se` (see `PUBLIC_WEB_DOMAIN`/
`PUBLIC_WEB_URL` in `artifacts/bara/constants/config.ts`).

## Deploying

Railway builds from `almi-ready` (`railway.json` / `railway.toml` /
`nixpacks.toml`). The build installs dependencies, runs `expo export
--platform web` into `artifacts/api-server/static-build/` (which
`app.ts` serves directly), then builds the API server. Healthcheck is
`GET /api/healthz` only — do not point it at `/api/health` (that path
doesn't exist and would silently pass via the SPA catch-all instead of
actually checking server health).

```bash
# what CI/Railway run, for reference — do this locally to sanity-check a deploy:
pnpm install --frozen-lockfile
cd artifacts/bara && npx expo export --platform web --clear --output-dir ../api-server/static-build
cd ../.. && pnpm --filter @workspace/api-server run build
```

## What code cannot fix — remaining manual/business work

Code changes reduce gig/insurance-liability surface area (no open job
feed, no individual driver payouts, no public carrier/worker
self-registration, DAC7/earnings always attributed to the carrier
company) but cannot themselves make Bära legally safe to operate at scale:

- **Lawyer review** of the carrier partner terms, shipper terms, and the
  liability language itself (all currently marked LEGAL REVIEW NEEDED)
  before any real money or contracts are involved.
- **Insurance confirmation**: verify each onboarded carrier's self-reported
  liability insurance is real and adequate (admin has a verification
  toggle, but no automated check) before assigning them jobs.
- **F-skatt / DAC7 compliance**: the mechanics are enforced in code, but
  the actual annual Skatteverket reporting obligation is a business
  process, not something this codebase performs on its own.
- **Recruit initial supply and demand manually**: target roughly 5 carrier
  companies and 5 shipper companies for a first cohort, onboarded by admin
  one at a time — there is deliberately no ad spend or open signup funnel
  at this stage.
- **Manual pricing for commercial shipments** that don't fit the existing
  99–299 SEK band, until real volume shows what a commercial pricing model
  needs.
