# ALMI Readiness Tracker

Status key: ✅ Complete | 🔄 In Progress | ⏳ Not Started | ⚖️ Legal Review Required

---

## Priority 1 — Scope & Compliance

### 1A — 25 kg Weight Limit ✅
- Added mandatory `weightPreset` field to job creation (DB schema, API, frontend)
- Preset options: "0–10 kg", "10–20 kg", "20–25 kg", "Over 25 kg"
- Server rejects `over_25kg` with: "Bära is for small items only. For heavier items, please use a moving service."
- Frontend blocks submission and shows inline message when "Over 25 kg" is selected
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
- Both show: household waste, construction debris, hazardous materials, over 25 kg, special permits, full household moves

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

### 3A — Customer Receipt ⏳
- Post-completion receipt: addresses, distance, prices, driver, date/time
- In-app view under My Jobs → Completed → View Receipt
- Auto-send via Resend email (partial: sendReceiptEmail already exists)
- PDF download button

### 3B — Driver Payout Summary ⏳
- "My Earnings" screen: this week, this month, all time
- Per-job breakdown with CSV export

---

## Priority 4 — Onboarding & UX Clarity

### 4A — Customer Onboarding ⏳
- "What Bära is" screen on first app open
- Checklist of allowed/prohibited items

### 4B — Driver Onboarding Checklist ⏳
- Pre-acceptance checklist: F-tax, own car, 25 kg lifting, photo docs, driver agreement
- Block job acceptance until checklist complete (DB field needed)

### 4C — Insurance & Safety Screen ⏳ ⚖️
- Dedicated screen for both customer and driver flows
- **Legal review needed**: what IS and IS NOT covered under Swedish law

---

## Priority 5 — Cost Optimization

### 5A — Google Places Caching ⏳
- Client-side debounce (300ms, min 3 chars) — partial: 900ms debounce exists
- Client-side cache (last 10 results)
- Server-side 5-minute TTL cache on /places/autocomplete

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

1. **F-tax / independent contractor classification** (1D) — Swedish tax law, Skatteverket rules
2. **Insurance coverage statements** (4C) — what is/isn't covered under Swedish transport law
3. **Driver Agreement text** — employment vs. contractor status under Swedish labour law
4. **Cancellation fee policy** (2A) — consumer protection law (Konsumentköplagen)
5. **Data retention and GDPR** — location data, photos, payment data retention periods
