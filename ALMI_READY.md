# ALMI Readiness Tracker

Status key: ✅ Complete | 🔄 In Progress | ⏳ Not Started | ⚖️ Legal Review Required

---

## Legal & Risk Positioning ✅ ⚖️

Bära is positioned as a **technology marketplace platform**. Carriers are independent contractors. Platform does not employ, schedule, or control carriers.

### Change 1 — 15 kg Weight Limit ✅
- Weight limit lowered from 25 kg to 15 kg across all layers
- New presets: "0–5 kg", "5–10 kg", "10–15 kg", "Over 15 kg" (blocked)
- Server blocking message: "Bära is for small, light items only (max 15 kg). For heavier items, please use a moving service."
- All "not allowed" copy updated to reflect 15 kg in `home.tsx`, `post-job.tsx`
- Size guide confirmation checkbox updated to "under 15 kg"

### Change 2 — Carrier Terminology ✅
- All user-facing copy updated: "driver" → "carrier", "förare" → "bärare" (SV)
- Internal DB column names (`driverId`, `driverPayout`, etc.) kept unchanged
- `// LEGAL: carrier terminology reinforces independent contractor status` comments added
- Email receipt template updated: "Driver" → "Carrier"

### Change 3 — Marketplace Framing ✅
- App tagline updated: "Connect with independent carriers for small item pickup and delivery"
- `home.tsx` hero subtitle updated to marketplace framing
- `onboarding.tsx` slide 3 updated to carrier/marketplace framing
- `config.ts` exports `PLATFORM_TAGLINE_EN` and `PLATFORM_TAGLINE_SV`

### Change 4 — Independent Contractor Language ✅ ⚖️
- Carrier-facing footer in `earnings.tsx`: independent contractor disclaimer
- Customer-facing banner in `job-status.tsx`: carriers are independent service providers
- Job posting disclaimer in `post-job.tsx`: direct agreement between customer and carrier
- Onboarding slide 3 note: carriers are independent contractors, not employees
- All legal copy flagged with `⚖️` for Swedish lawyer review

### Change 5 — Tax Framing Corrected ✅ ⚖️
- **REMOVED** all hobby income / hobbyverksamhet language (legally incorrect — Skatteverket: no hobby income threshold, all income taxable from first krona)
- `earnings.tsx` tax card now correctly states: income is taxable from the first krona; carrier is responsible for declaring and paying egenavgifter (~28.5%); set aside 30–35%
- Links to `/tax-info` screen for full tax obligations detail
- "Skatt & ansvar" (`tax-info.tsx`) screen added: obligations list, DAC7 notice, interactive tax estimate widget (gross → egenavgifter → income tax → net), Skatteverket links

### Change 6 — Pricing Cap ✅
- `MAX_JOB_VALUE_SEK = 299` added to `config.ts` and API server
- "Jobs from 99 SEK — never more than 299 SEK" copy added to `translations.ts`
- Price range 99–299 SEK keeps platform in informal/hobby service territory

### Change 7 — ALMI_READY.md Updated ✅
- This section added to document all legal/risk positioning changes

---

## Priority 1 — Scope & Compliance

### 1A — 25 kg Weight Limit ✅ (superseded by Legal & Risk Change 1 above — now 15 kg)
- Weight limit originally implemented at 25 kg; lowered to 15 kg as part of legal/risk positioning
- Mandatory `weightPreset` field added to job creation (DB schema, API, frontend)
- Zod schema updated in `lib/api-zod/`
- **DB migration needed**: run `pnpm --filter @workspace/db push` before deploying

### 1B — other_small Category Validation ✅
- Server rejects `involvesHazardous: true` with clear error
- Server scans `itemDescription` for forbidden keywords (EN + SV) when jobType is other_small
- Frontend shows red restriction banner for other_small category
- Mandatory yes/no hazardous materials question blocks submission if answered "Yes" or unanswered

### 1C — "Not Allowed" List UI ✅
- home.tsx: always-visible "Bära does NOT transport" card above category grid (6 items, EN + SV)
- post-job.tsx: non-collapsible "Not allowed" block placed directly before the submit button
- Both show: household waste, construction debris, hazardous materials, over 15 kg, special permits, full household moves

### 1D — F-tax (F-skatt) Driver Compliance ✅ ⚖️
- DB: added `ftax_registered`, `ftax_number`, `ftax_verified_by_admin` columns to users table
- API: `formatUser` exposes ftax fields; profile update endpoint accepts `ftaxRegistered` + `ftaxNumber`
- API: job accept endpoint blocks drivers whose projected earnings exceed 1,000 SEK without F-tax registered
- API: job complete endpoint now accumulates `annual_earnings` per driver
- Admin: `PUT /admin/drivers/:id/ftax` endpoint for admin-verified F-tax marking; drivers list includes ftax fields
- Frontend: driver edit-profile has F-tax toggle + number input + verified badge
- Frontend: earnings screen shows warning banner when earnings approach 1,000 SEK
- Contractor disclaimer shown in driver profile and earnings screens
- **⚖️ Legal review needed**: independent contractor classification, F-skatt threshold accuracy, disclaimer wording
- DB migration required: run `pnpm --filter @workspace/db push` before deploying

---

## Priority 2 — Job Lifecycle UX

### 2A — Cancellation Flow ✅
- Customer cancels before acceptance → no fee (unchanged, works)
- Customer cancels after acceptance → 150 SEK fee modal with corrected split: driver 100 kr / platform 50 kr
- Driver cancels → `cancelledByDriverId` stored on job; accept endpoint blocks if 3+ cancellations in last 30 days (`DRIVER_LOCKED_OUT` error code)
- Cancel confirm card in `active-job.tsx` warns driver about lockout threshold
- `DRIVER_CANCEL_COMPENSATION = 100` constant added to `config.ts`
- **DB migration needed**: `cancelledByDriverId` column added to jobs table

### 2B — Dispute Flow UI ✅
- Dispute modal in `job-status.tsx` upgraded: optional photo picker (up to 3 photos) + text description
- Photos submitted to backend and stored in `disputePhotos` column (new)
- Admin `POST /disputes/:id/resolve` now accepts `{ note, resolution: "refund_customer" | "pay_driver" | "split" }` — stores resolution type in `disputeResolution` column (new)
- **DB migration needed**: `disputePhotos`, `disputeResolution` columns added to jobs table

### 2C — Rating & Trust Signals ✅
- "Top Driver" badge added to `JobCard.tsx` driver row (shown when rating ≥ 4.8 AND totalJobs ≥ 20)
- "BankID Verified Soon" placeholder badge added to `JobCard.tsx` driver row
- Same badges added to driver detail card in `job-status.tsx`
- `Job` interface in `JobCard.tsx` extended with `disputed`, `disputeReason`, `disputePhotos`, `disputeResolution`

---

## Priority 3 — Receipts & Documentation

### 3A — Customer Receipt ✅
- Post-completion receipt: addresses, distance, prices, driver, date/time
- In-app view: My Jobs → Completed → "View Receipt" button → `/(customer)/receipt`
- Auto-send via Resend email at job completion (already wired)
- "Re-send Receipt Email" button on receipt screen
- "Open Printable Version" button opens `GET /api/jobs/:id/receipt` (HTML) in browser for print/save as PDF
- `GET /api/jobs/:id/receipt` and `POST /api/jobs/:id/resend-receipt` added to API

### 3B — Driver Payout Summary ✅
- "My Earnings" screen: this week, this month, all time — 3-card layout
- Per-job breakdown (already existed)
- "Export CSV" button uses RN Share sheet (cross-platform, no new packages)

---

## Priority 4 — Onboarding & UX Clarity

### 4A — Customer Onboarding ✅
- Onboarding now has 4 slides: Welcome → What you can send → How it works → Earn as a carrier
- Slide 2 shows ✅ Allowed and ❌ Not allowed columns (EN + SV)
- Prohibited items: household waste, construction debris, hazardous materials, over 15 kg, full household moves

### 4B — Driver Onboarding Checklist ✅
- New screen: `driver-onboarding-checklist.tsx` — 7-item self-cert checklist
- Items: driver agreement signed, DAC7 consent given, F-tax registration, own vehicle, can lift 15 kg, knows prohibited items, understands contractor status
- DAC7 and driverAgreementAccepted items auto-pre-checked from user profile; F-tax item also auto-pre-checked
- Locked items cannot be unchecked (already verified via API flow)
- `driverOnboardingComplete` boolean added to DB users table (migration needed)
- `formatUser` in auth.ts exposes `driverOnboardingComplete`
- `POST /api/users/complete-driver-onboarding` marks the field true
- `/(driver)/map`: redirects to checklist if `driverOnboardingComplete` is false
- `POST /api/jobs/:id/accept`: blocks with `ONBOARDING_INCOMPLETE` error if checklist not done
- **DB migration needed**: run `pnpm --filter @workspace/db push` before deploying

### 4C — Insurance & Safety Screen ✅ ⚖️
- Screen existed: `insurance-safety.tsx` — platform insurance, driver requirements, customer protection, prohibited items, emergency contacts
- Added entry point from customer `home.tsx` ("Insurance & Safety" link in scroll footer)
- Added entry point from driver `earnings.tsx` ("Insurance & Safety" link above contractor disclaimer)
- **⚖️ Legal review needed**: platform insurance coverage statements and what IS/IS NOT covered under Swedish transport law

---

## Priority 5 — Cost Optimization

### 5A — Google Maps → Mapbox Migration ✅
- **Cost**: Mapbox is 14× cheaper than Google Maps. Free tier: 100,000 geocoding calls/month.
- `react-native-maps` (Google) replaced with `@rnmapbox/maps` (Mapbox) for native map display
- `DriverMapView.web.tsx` now uses Mapbox Static Images API instead of Google Maps embed iframe
- `artifacts/api-server/src/routes/places.ts` now calls Mapbox Geocoding API (country=se, language=sv)
- `artifacts/api-server/src/routes/distance.ts` now uses Nominatim (free) → Mapbox fallback; Google removed
- `geocodeAddress()` in `config.ts` now calls Mapbox Geocoding API
- Autocomplete predictions now include lat/lng coordinates — eliminates a second API round-trip
- Client-side cache: last 20 autocomplete queries (module-level Map in `PlacesAutocomplete.tsx`)
- Client-side debounce: 500ms (was 320ms) before firing autocomplete request
- Mapbox API call tracking: `maps_api_calls` table in DB; admin endpoint `GET /admin/maps/usage`
- **Railway env vars needed**: `EXPO_PUBLIC_MAPBOX_TOKEN` (pk. token) + `MAPBOX_SECRET_TOKEN` (sk. token)

### 5B — Cloudinary Upload Limits ⏳
- Client-side compression: max 1200px, 80% quality
- Limit to 4 photos per job (currently 3 in UI)
- Server-side max 5 MB per file Zod validation

### 5C — Email & Push Notification Limits ⏳
- Audit and remove non-critical notification triggers

### 5D — Railway Build Optimization ⏳
- Confirm railway.toml only builds api-server
- Add build caching to GitHub Actions

---

## Priority 6 — Admin Dashboard

### 6A — Extended Admin Dashboard ⏳
- Jobs by status, today/week/month counts
- Top drivers, cancellation rate, dispute rate
- Revenue breakdown, conversion funnel

### 6B — KPI Tracking Table ⏳
- `analytics_events` table via Drizzle
- Log: job_created, job_accepted, job_completed, job_cancelled, job_disputed, rating_submitted, driver/customer_registered

---

## Priority 7 — Multi-City Readiness

### 7A — City/Region in Database ⏳
- Add city field to jobs, users, drivers tables (city already exists on jobs and users)
- Default "Växjö" for existing records

### 7B — City-Based Pricing Config ⏳
- Move pricing rules into a per-city config table
- Admin UI to set pricing per city

---

## Swedish Legal Compliance Summary ✅ ⚖️

Implemented ahead of applicable deadlines. All items flagged for Swedish lawyer review before public launch.

### DAC7 — EU Directive on Platform Reporting (mandatory) ✅
- **What it requires**: Platforms must collect and annually report carrier KYC data (personnummer, legal name, address, bank account) to Skatteverket when a carrier earns > €2,000 or completes > 30 transactions/year
- **DB changes**: Added `personnummer`, `fullLegalName`, `registeredAddress`, `bankAccountNumber`, `dac7Consented`, `dac7ConsentDate` to users table; created `dac7_reports` table
- **Consent flow**: `dac7-consent.tsx` screen with full bilingual legal disclosure; linked from driver onboarding checklist
- **Admin export**: `GET /admin/dac7/report/:year?format=csv` — aggregates completed jobs by carrier, computes gross earnings / platform fees / net paid
- **DB migration required** before deploy

### Tax Framing — Skatteverket Compliance ✅
- **Problem fixed**: Previous "hobby income" framing was legally incorrect — Skatteverket: there is no hobby income threshold for this type of work; all income is taxable from the first krona
- **Carrier obligation**: Carriers must declare income, pay egenavgifter (~28.5% on net earnings), and hold F-skatt or FA-skatt registration
- **Tax info screen** (`tax-info.tsx`): Full obligations list, DAC7 notice, interactive gross→net calculator, Skatteverket links
- **Earnings screen**: Corrected tax card with accurate language; link to `/tax-info`
- **⚖️ Review needed**: Confirm egenavgifter rate (28.97% in 2025), confirm no threshold applies to this income type

### VAT Threshold — Updated to 2025 Rules ✅
- **Threshold**: 120,000 SEK/year (updated from 80,000 SEK) applies to Bära's platform fee revenue, NOT the full job value
- **Admin monitoring**: `GET /admin/vat/status` — returns current year platform fee revenue with alert levels:
  - `ok`: below 80,000 SEK
  - `warning`: 80,000–115,000 SEK (approaching threshold)
  - `urgent`: 115,000–120,000 SEK (immediate action required)
- **⚖️ Review needed**: Confirm VAT applies to platform commission only (not full job price passed through to carrier)

### EU Platform Work Directive ✅ (deadline: December 2026)
- **What it requires**: Platforms must not impose exclusivity; must allow free job refusal without penalty; must disclose algorithmic decision-making; carriers set own prices with platform as baseline
- **Driver agreement updated** with explicit rights:
  - No minimum hours required
  - No exclusivity — carriers may work for other platforms
  - No penalty for declining any job
  - Carrier responsible for own vehicle, fuel, phone
  - Carrier may add surcharges for stairs/distance (pricing baseline from Bära, not a ceiling)
  - Commission rate never changes without 60 days notice
  - Right to appeal any deactivation within 14 days
- **⚖️ Review needed**: Confirm appeal process, deactivation criteria, and algorithmic transparency disclosure requirements

### Carrier Surcharges ✅
- **Purpose**: Reduces price-control risk under the Platform Work Directive — carriers set their own additions to the base price
- **Options**: Stairs (+50 SEK), Extra distance (+25 SEK)
- **Flow**: Driver selects surcharges in acceptance sheet → job status moves to `surcharge_requested` → customer approves or declines → if approved, status becomes `accepted`; if declined, job returns to `pending`
- **DB changes**: `surchargeStairs`, `surchargeDistance`, `surchargeTotalSek`, `surchargeApprovedAt` columns added to jobs table; `surcharge_requested` added to status enum
- **DB migration required** before deploy

### Customer Tip ✅
- **Flow**: On rating screen, customer can optionally add 10/20/50 SEK tip
- **Policy**: 100% of tip goes to carrier (not subject to 25% platform commission)
- **DB**: `tipAmount` column on jobs table; tip stored at rating submission
- **DB migration required** before deploy

### Referral System ✅ (infrastructure only — UI pending)
- **DB**: `referralCode`, `referredBy`, `referralCount`, `referralBonusEarned` added to users table
- **On registration**: 8-character hex referral code generated per user; if `referralCode` param provided, referrer's `referralCount` incremented
- **Exposed via API**: `referralCode` and `referralCount` in `formatUser`
- **Pending**: Referral code display/share UI; bonus payout trigger logic

---

## Railway Environment Variables

Set these in Railway → Project → Variables before deploying.

### Required (app will not start without these)
| Variable | Where | Notes |
|---|---|---|
| `DATABASE_URL` | API server | Provisioned automatically by Railway Postgres plugin |
| `JWT_SECRET` | API server | Min 32 chars, random string |
| `BARA_ADMIN_KEY` | API server | Random hex, used for admin dashboard access |
| `APP_BASE_URL` | API server | e.g. `https://your-service.railway.app` |
| `EXPO_PUBLIC_DOMAIN` | Bara app build | Domain of the API server (no https://) |
| `EXPO_PUBLIC_MAPBOX_TOKEN` | Bara app build | Mapbox **public** token (starts with `pk.`) |
| `MAPBOX_SECRET_TOKEN` | API server | Mapbox **secret** token (starts with `sk.`) — for server-side geocoding |

### Required for email receipts
| Variable | Where | Notes |
|---|---|---|
| `RESEND_API_KEY` | API server | From resend.com |
| `RESEND_FROM_EMAIL` | API server | Verified sender address |

### Required for dispute photo uploads
| Variable | Where | Notes |
|---|---|---|
| `CLOUDINARY_CLOUD_NAME` | API server | From cloudinary.com |
| `CLOUDINARY_API_KEY` | API server | From cloudinary.com |
| `CLOUDINARY_API_SECRET` | API server | From cloudinary.com |

### Mapbox token setup
1. Go to https://account.mapbox.com/ → Tokens → Create a token
2. **Public token** (`pk.`): scope `styles:read`, `tiles:read`, `geocoding` — safe to bundle in the app
3. **Secret token** (`sk.`): scope `geocoding` — server-side only, never exposed to client
4. Add both to Railway environment variables as above

---

## Final Checklist

- [ ] App loads without errors on iOS and Android
- [ ] Full job flow works end-to-end: create → accept → complete → receipt
- [ ] Driver can register, pass checklist, accept job, and get paid
- [ ] Admin dashboard shows live data
- [ ] All "not allowed" copy visible before job creation
- [ ] F-tax field exists in driver profile
- [ ] Receipt sent by email after job completion
- [ ] Rate limiting active on all endpoints
- [ ] No console errors or TypeScript errors
- [ ] README updated to reflect current state

---

## Items Requiring Swedish Legal Review Before Launch ⚖️

1. **F-tax / independent contractor classification** (1D) — confirm Skatteverket threshold accuracy; F-skatt vs. FA-skatt requirement
2. **Insurance coverage statements** (4C) — what is/isn't covered under Swedish transport law (Trafikskadelagen)
3. **Carrier Agreement text** — employment vs. contractor status under Swedish labour law (Arbetsrätt); EU Platform Work Directive compliance
4. **Cancellation fee policy** (2A) — consumer protection law (Konsumentköplagen)
5. **Data retention and GDPR** — location data, photos, payment data, KYC/DAC7 data retention periods
6. **Independent contractor disclaimers** — wording review for Swedish labour law compliance
7. **Tax framing** — confirm egenavgifter rate (~28.97% in 2025), confirm all Bära income is non-hobby by Skatteverket definition
8. **VAT threshold** — confirm 120,000 SEK applies to platform commission only, not full job value passed through
9. **DAC7 KYC obligations** — confirm reporting thresholds (€2,000 / 30 transactions) and data format required by Skatteverket
10. **Surcharge legitimacy** — confirm carrier surcharges are legally distinguishable from platform-set pricing under the Platform Work Directive
11. **Marketplace platform positioning** — verify platform is not liable as transport carrier under Swedish law (Transportlagen)
