# Bära — On-Demand Furniture Transport & Junk Pickup (Sweden)

Bära is a mobile-first marketplace connecting customers in Sweden with independent drivers for on-demand furniture transport and junk pickup. Built with Expo React Native (frontend) and Node.js/Express (backend), deployed on Railway.

## What Bära Transports
Bära is designed for everyday small items that fit in a standard car.

✅ Accepted: Any legal item under 25 kg that fits in a standard car
❌ Not accepted: Illegal items of any kind
❌ Not accepted: High-value or expensive items (antiques, luxury goods, high-end electronics)

These limits are enforced at both the customer app and API level.

---

## Architecture

```
/artifacts/api-server   → Node.js/Express REST API (TypeScript, ESM)
/artifacts/bara         → Expo React Native app (iOS, Android, Web)
/lib/db                 → Drizzle ORM schema + PostgreSQL client
/lib/api-zod            → Shared Zod response schemas
```

---

## Environment Variables

Copy `.env.example` to `.env` in `/artifacts/api-server/` and fill in the values.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string (e.g. `postgres://user:pass@host:5432/bara`) |
| `JWT_SECRET` | Yes | Secret key for signing JWTs — use a strong random string in production |
| `PORT` | No | API server port (default: 3000) |
| `NODE_ENV` | No | Set to `production` on Railway |
| `ADMIN_STATS_KEY` | No | Key for `/api/admin/stats` endpoint (default: `bara-admin-2025`) — change in production |
| `EXPO_PUBLIC_DOMAIN` | Yes (app) | Domain where the API server is reachable (e.g. `your-app.railway.app`) |
| `EXPO_PUBLIC_GOOGLE_MAPS_KEY` | Yes (app) | Google Maps API key for map display |

---

## Local Development

### Prerequisites
- Node.js 18+
- pnpm 9+
- PostgreSQL (or a Railway DB you can connect to locally)

### Setup

```bash
# Install all dependencies from workspace root
pnpm install

# Push database schema (first time or after schema changes)
cd lib/db && pnpm push

# Start API server
pnpm --filter @workspace/api-server run dev

# Start Expo app (in a separate terminal)
pnpm --filter @workspace/bara run dev
```

---

## Railway Deployment

### One-time Setup

1. Create a Railway project and add a **PostgreSQL** plugin
2. Connect your GitHub repo to Railway
3. Set all required environment variables in the Railway dashboard (see table above)
4. Railway will auto-deploy from `main` branch on every push

### Build & Start

Railway uses `railway.toml` at the repo root:
- **Build:** `cd artifacts/api-server && npm install --legacy-peer-deps && npm run build`
- **Start:** `node artifacts/api-server/dist/index.js`

### Push schema to production DB

```bash
DATABASE_URL=<your_railway_db_url> pnpm --filter @workspace/db run push
```

---

## Health Check

```
GET /api/healthz
```

Returns `{ status: "ok", timestamp: "..." }`. Use this as Railway's health check URL.

---

## API Endpoints

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create account (customer/driver/both) |
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET | `/api/auth/me` | JWT | Get current user profile |

### Jobs
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/jobs` | JWT | List jobs (filter by `city`, `status`) |
| GET | `/api/jobs/:id` | JWT | Get job details |
| POST | `/api/jobs` | JWT | Create a new job |
| POST | `/api/jobs/:id/accept` | JWT | Driver accepts a pending job |
| POST | `/api/jobs/:id/arrived` | JWT | Driver marks arrival at pickup |
| POST | `/api/jobs/:id/photos` | JWT | Upload pickup/dropoff photos |
| POST | `/api/jobs/:id/complete` | JWT | Driver completes the job |
| POST | `/api/jobs/:id/dispute` | JWT | Flag a dispute with a reason |
| POST | `/api/jobs/:id/rate` | JWT | Rate the other party |
| POST | `/api/jobs/:id/cancel` | JWT | Cancel the job |

### Admin
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/stats?key=<ADMIN_STATS_KEY>` | Key | Platform statistics |

---

## Job Lifecycle

```
pending → accepted → arrived → in_progress → completed
                 ↘                         ↗
                   cancelled / disputed
```

Status meanings:
- `pending` — Job posted, waiting for a driver
- `accepted` — Driver has accepted, en route to pickup
- `arrived` — Driver has arrived at pickup location
- `in_progress` — Items loaded, heading to destination
- `completed` — Job done (both photos required)
- `cancelled` — Cancelled by customer (pending only) or driver
- `disputed` — Flagged by either party — requires manual review

---

## Checking Logs on Railway

1. Go to your Railway project → **Deployments**
2. Click the latest deployment → **View Logs**
3. Filter by log level using the search bar

Or use Railway CLI:
```bash
railway logs
```

---

## Common Failures & Recovery

| Problem | Likely Cause | Fix |
|---|---|---|
| `ECONNREFUSED` on startup | `DATABASE_URL` not set or DB not reachable | Check Railway env vars, ensure DB plugin is attached |
| `401 Unauthorized` on all requests | `JWT_SECRET` mismatch between token generation and validation | Ensure `JWT_SECRET` is consistent across deployments |
| Build fails: `EUNSUPPORTEDPROTOCOL` | Stale `workspace:*` deps — use `file:` protocol | Already fixed in `artifacts/api-server/package.json` |
| Build fails: esbuild peer conflict | esbuild version mismatch | Fixed: `esbuild@^0.25.8` + `--legacy-peer-deps` |
| Schema out of sync | New columns added without pushing | Run `drizzle-kit push` against production DB |
| `Cannot complete job` (missing photos) | Driver didn't upload both pickup and dropoff photos | Required by design — driver must upload both sets |

---

## Database Schema

Key tables:
- **users** — customers and drivers; includes `verificationStatus`, `driverLicenseStatus`, `cancellationsCount`, `noShowCount`
- **jobs** — full job lifecycle; includes `disputed`, `disputeReason`, `arrivedAt`, `disputedAt`
- **ratings** — star ratings between customers and drivers

Schema is managed via Drizzle ORM's `push` command (no migration files).

---

## What Still Needs Third-Party Setup

| Feature | Status | Notes |
|---|---|---|
| Payments (Stripe) | Not active | Schema ready (`priceTotal`, `driverPayout`, `platformFee`). Free during launch. |
| BankID verification | Placeholder only | `verificationStatus` + `driverLicenseStatus` fields exist. Integration not built. |
| Push notifications | Not built | `isAvailable` toggle exists. Notification infrastructure TBD. |
| Google Maps | Active | Requires `EXPO_PUBLIC_GOOGLE_MAPS_KEY`. Map provider abstraction planned. |

---

## For ALMI / Venture Cup Presentations

**What works today:**
- Full two-sided marketplace (customers post, drivers accept)
- Real-time job tracking with status updates
- Mandatory photo documentation for every job
- Ratings and trust system
- Dispute flagging and escalation flow
- Swedish cities, bilingual UI (EN/SV)
- GDPR-compliant privacy policy and user data deletion flow
- Railway-hosted backend with health monitoring

**Business model (post-launch):**
- 25% platform fee on each job
- Free during launch period to drive adoption
- Driver verification (BankID) planned for Q2

**Growth levers:**
- Expand to more Swedish cities (currently: Stockholm, Göteborg, Malmö, Uppsala, Västerås, Örebro, Linköping)
- B2B tier for moving companies and estate clearances
- Subscription model for high-volume drivers
