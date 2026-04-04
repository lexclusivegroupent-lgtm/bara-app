# Workspace — Bära App

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Bära — Mobile App

On-demand furniture transport and junk pickup for Sweden. Navy (#1B2A4A) + Gold (#C9A84C) brand.

### Mobile App (`artifacts/bara/`)
- Expo React Native with file-based routing (expo-router)
- Customer + Driver dual roles (+ "both" role)
- 3 job types: furniture_transport, bulky_delivery, junk_pickup
- Full job lifecycle: pending → accepted → arrived → in_progress → completed (+ cancelled/disputed/cancelled_by_driver)
- Auth: JWT stored in AsyncStorage ("bara_token"), forgot/reset password flow
- Forgot password: `POST /api/auth/forgot-password` → returns devToken in non-prod, logs to console
- Reset password: `POST /api/auth/reset-password` → validates SHA-256 hashed token with expiry
- Full Swedish/English translation toggle (`bara_language` key, `useLanguage()` hook)
- 160+ Swedish cities across all 21 counties

### API Server (`artifacts/api-server/`)
- Express 5 + PostgreSQL + Drizzle ORM
- Railway deployment: startCommand = `node artifacts/api-server/dist/index.mjs`
- Health check: `GET /api/healthz`
- Admin stats: `GET /api/admin/dashboard?key=<BARA_ADMIN_KEY>`
- Jobs: `GET/POST /api/jobs`, `GET /api/jobs/:id`, `POST /api/jobs/:id/cancel`, `POST /api/jobs/:id/complete`, `POST /api/jobs/:id/photos`, `POST /api/jobs/:id/reschedule` (≥1h from now, notifies driver), `GET/POST /api/jobs/:id/messages` (in-app chat)
- Users: `PUT /api/users/profile` (accepts vehicleType, vehicleDescription, isAvailable, city, fullName), `PUT /api/users/push-token`, `DELETE /api/users/account` (GDPR soft-delete)
- Addresses: `GET/POST/DELETE /api/addresses` (saved addresses per user, max 10)
- Promos: `POST /api/promos/validate` (promo code validation)
- Support: `POST /api/support/contact` (sends email via Resend to support inbox)
- Places: `GET /api/places/autocomplete` (Google Places proxy)

### Key Config
- **JWT_SECRET**: Required in production — server refuses to start if missing or insecure
- **ADMIN_STATS_KEY**: Required in production — endpoint returns 403 if missing or default value
- **CORS_ORIGIN**: Comma-separated allowed origins (logs warning in prod if not set, defaults to *)
- **GOOGLE_MAPS_KEY**: Server-side key for geocoding/distance — returns 503 if not set (no random fallback)
- **RESEND_API_KEY**: For real password reset emails (free tier, resend.com)
- **RESEND_FROM_EMAIL**: Sender address (default: Bära <noreply@bara.app>)
- **APP_BASE_URL**: Base URL used in password reset email links
- **EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME**: Cloudinary account name (unsigned uploads)
- **EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET**: Unsigned upload preset name
- Without Resend: devToken returned in API response only in dev (NODE_ENV !== "production")
- Rate limiting: 10 req/15min on /api/auth/login, /register, /forgot-password (prod only)
- See `.env.example` for all env vars with setup instructions

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `artifacts/bara` (`@workspace/bara`)

Expo React Native mobile app — **Bära**, an on-demand furniture transport and junk pickup service for Sweden.

- Brand: Navy (#1B2A4A) + Gold (#C9A84C), dark theme throughout
- Two user roles: Customer and Driver
- Routing: `app/(customer)/*` and `app/(driver)/*` route groups with custom `BottomNav` component
- Auth: JWT stored in AsyncStorage via `AuthContext`, redirects to role-specific home on login
- Key screens (Customer): `home`, `post-job` (with logistics fields, extra stops, promo code), `my-jobs`, `job-status` (with chat button), `rate`, `settings`, `edit-profile`, `support`, `chat`
- Key screens (Driver): `map` (available jobs feed + online toggle), `active-job` (cancel + chat), `earnings`, `rate`, `settings`, `edit-profile`, `support`, `chat`
- Pricing: furniture_transport base 299kr + 15kr/km, junk_pickup base 199kr + 10kr/km, min 349kr
- Driver payout: 75%, platform: 25%
- `constants/config.ts` — pricing calc, Swedish cities list, formatters, `BASE_URL`
- `constants/colors.ts` — Navy+Gold color theme
- `constants/translations.ts` — full EN + SV translations for all screens
- `components/JobCard.tsx` — shared job card used by both customer and driver screens
- `components/BottomNav.tsx` — tab navigation component
- `components/PhotoPicker.tsx` — reusable photo capture/view component
- `context/AuthContext.tsx` — auth state management with AsyncStorage persistence
- Post-job form fields: jobType, addresses, extraStops, itemDescription, preferredTime, floorNumber, hasElevator, helpersNeeded, estimatedWeightKg, promoCode, customerPrice, photos
- Driver cancellation: `POST /api/jobs/:id/cancel` (driver role) → sets `cancelled_by_driver`, returns job to pending pool, increments driver cancellationsCount
- GDPR deletion: `DELETE /api/users/account` → anonymises PII, keeps job records for accounting
- In-app chat: `GET/POST /api/jobs/:id/messages` → stored in `messages` table, push notification sent to other party
- Promo codes: `promo_codes` table; `POST /api/promos/validate` validates code; applied discount stored on job
- Saved addresses: `saved_addresses` table; max 10 per user; `GET/POST/DELETE /api/addresses`

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
