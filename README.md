# Bära — On-Demand Small Item Transport in Sweden

> Small items only · Fits in any car · From 99 SEK · Done in 30 minutes

Bära is a mobile-first marketplace connecting customers who need small items picked up or moved with drivers who can do it from their regular car. No van, no trailer — any regular car qualifies. Items must fit in a standard car and weigh under 25 kg.

---

## Project Structure

```
bara-app/
├── artifacts/
│   ├── bara/              # Expo React Native mobile app (@workspace/bara)
│   └── api-server/        # Node.js + Express API (@workspace/api-server)
├── lib/                   # Shared TypeScript utilities
├── .github/workflows/     # GitHub Actions CI/CD
├── pnpm-workspace.yaml
└── railway.toml           # Railway deployment config
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | Expo / React Native (iOS, Android, Web) |
| API Server | Node.js + Express + TypeScript |
| Database | PostgreSQL (via Drizzle ORM) |
| Auth | JWT (stored in AsyncStorage) |
| File Uploads | Cloudinary |
| Maps | Google Maps / react-native-maps |
| Address Search | Google Places Autocomplete |
| Push Notifications | Expo Push Notifications |
| Email | Resend |
| Deployment | Railway (API), Expo (mobile) |
| CI/CD | GitHub Actions |

---

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) v9+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo-cli`)
- A PostgreSQL database (local or hosted)
- Accounts for: [Cloudinary](https://cloudinary.com), [Resend](https://resend.com), [Google Cloud](https://console.cloud.google.com) (Maps + Places APIs)

---

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/lexclusivegroupent-lgtm/Bara-App.git
cd Bara-App
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

```bash
# API server
cp artifacts/api-server/.env.example artifacts/api-server/.env

# Mobile app
cp artifacts/bara/.env.example artifacts/bara/.env
```

Fill in all values — see the `.env.example` files for descriptions of each variable.

### 4. Set up the database

```bash
cd artifacts/api-server
pnpm run db:push
```

This runs Drizzle migrations to create all tables.

### 5. Start development servers

```bash
# Start both the API server and Expo app simultaneously
pnpm run dev

# Or individually:
pnpm --filter @workspace/api-server run dev   # API on port 8080
pnpm --filter @workspace/bara run dev          # Expo app
```

The API server runs on **http://localhost:8080**.  
Open the Expo app in your browser, or scan the QR code with the Expo Go app.

---

## Environment Variables

### API Server (`artifacts/api-server/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing JWTs (min 32 chars) |
| `BARA_ADMIN_KEY` | Admin dashboard access key |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `RESEND_API_KEY` | Resend email API key |
| `RESEND_FROM_EMAIL` | Sender email address (e.g. `hello@baraapp.se`) |
| `APP_BASE_URL` | Production URL of the app (e.g. `https://app.baraapp.se`) |
| `ADMIN_STATS_KEY` | Secondary key for admin stats endpoint |

### Mobile App (`artifacts/bara/.env`)

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_DOMAIN` | Domain where the API is hosted (without `https://`) |
| `EXPO_PUBLIC_GOOGLE_MAPS_KEY` | Google Maps + Places API key |

---

## 7 Job Categories

| Category | Description |
|---|---|
| `blocket_pickup` | Items bought on Blocket |
| `facebook_pickup` | Facebook Marketplace pickups |
| `small_furniture` | Small chairs, bedside tables, shelves |
| `office_items` | Monitors, printers, small office equipment |
| `children_items` | Strollers, toys, children's furniture |
| `electronics` | TVs, computers, gaming consoles |
| `other_small` | Anything small under 25 kg |

---

## Pricing

- **Base**: 99 SEK
- **Per km**: +10 SEK
- **Cap**: Maximum 299 SEK
- **Driver payout**: 75% of total
- **Platform fee**: 25%
- **Cancellation fee**: 150 SEK (charged when customer cancels after driver accepts)

---

## Job Status Flow

```
pending → accepted → arrived → in_progress → completed
                                           ↘ cancelled
                                           ↘ cancelled_by_customer
                                           ↘ disputed
```

---

## API Endpoints

All routes are prefixed with `/api`.

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register new account |
| POST | `/auth/login` | Login and receive JWT |
| GET | `/auth/me` | Current user profile |
| POST | `/auth/forgot-password` | Send password reset email |
| POST | `/auth/reset-password` | Apply reset token |
| DELETE | `/auth/account` | GDPR account deletion |
| GET | `/jobs` | List jobs |
| POST | `/jobs` | Create a new job |
| GET | `/jobs/:id` | Job detail |
| PATCH | `/jobs/:id/accept` | Driver accepts job |
| PATCH | `/jobs/:id/arrived` | Driver marks arrived |
| PATCH | `/jobs/:id/start` | Driver starts transport |
| PATCH | `/jobs/:id/complete` | Driver completes job |
| PATCH | `/jobs/:id/cancel` | Cancel job |
| PATCH | `/jobs/:id/dispute` | Raise a dispute |
| PATCH | `/jobs/:id/reschedule` | Reschedule job time |
| POST | `/jobs/:id/rate` | Submit rating |
| GET | `/places/autocomplete` | Google Places proxy |
| GET | `/places/details` | Place coordinates by ID |
| POST | `/distance` | Distance calculation |
| POST | `/upload` | Cloudinary file upload |
| POST | `/promos/validate` | Validate promo code |
| GET | `/addresses` | Saved addresses |
| POST | `/addresses` | Save address |
| DELETE | `/addresses/:id` | Delete saved address |
| POST | `/support` | Send support message |
| POST | `/appeals` | Submit dispute appeal |
| GET | `/admin` | Admin dashboard (HTML) |
| GET | `/health` | Health check |

---

## Deployment

### Backend — Railway

The API server is configured for Railway deployment via `railway.toml` and `artifacts/api-server/railway.toml`.

1. Create a Railway project and add a PostgreSQL service
2. Set all environment variables from `artifacts/api-server/.env.example`
3. Connect this GitHub repository to Railway — it will auto-deploy on push to `main`

### Mobile — Expo

```bash
# Build for web
cd artifacts/bara
pnpm run build:web

# Submit to App Store / Google Play
eas build --platform ios
eas build --platform android
eas submit
```

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Customer | `demo.customer@baraapp.se` | `BaraDemo2026` |
| Driver | `demo.driver@baraapp.se` | `BaraDemo2026` |

---

## Legal & Compliance

The app includes full Swedish legal compliance:

- **Terms of Service** (Swedish)
- **Privacy Policy** (GDPR compliant)
- **Driver Agreement** (independent contractor terms)
- **Driver Welfare screen** (status, rights, F-tax reminder, tax reserve guidance)
- **Insurance & Safety** information
- **Data Export** and **Account Deletion** (GDPR Article 17)
- **Dispute & Appeal** flow

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'feat: add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

## Contact

**Bära AB** · [baraapp.se](https://baraapp.se) · hello@baraapp.se
