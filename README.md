# Bära

  **On-demand furniture transport and junk pickup in Sweden.**

  Bära connects customers with trusted drivers for hassle-free furniture moves and junk removal — anytime, anywhere in Sweden.

  ## Stack

  | Layer | Technology |
  |-------|-----------|
  | Mobile App | Expo React Native (TypeScript) |
  | Backend API | Express.js + TypeScript |
  | Database | PostgreSQL via Drizzle ORM |
  | Maps | Google Maps (react-native-maps) |
  | Auth | JWT (AsyncStorage) |
  | File Storage | Base64 in PostgreSQL |

  ## Monorepo Structure

  ```
  bara-app/
  ├── artifacts/
  │   ├── bara/              # Expo React Native app
  │   │   ├── app/           # Expo Router screens
  │   │   │   ├── (customer)/ # Customer-facing screens
  │   │   │   ├── (driver)/   # Driver-facing screens
  │   │   │   └── index.tsx   # Landing page
  │   │   ├── components/    # Shared UI components
  │   │   ├── constants/     # Colors, config
  │   │   ├── context/       # Auth context
  │   │   └── utils/         # API helpers
  │   └── api-server/        # Express API server
  │       └── src/
  │           ├── routes/    # API endpoints
  │           └── middlewares/
  └── lib/
      └── db/                # Drizzle ORM schema + migrations
          └── src/schema/
  ```

  ## Features

  - **Two user roles**: Customer and Driver (plus dual "both" role)
  - **Job posting**: Furniture transport & junk pickup with address autocomplete
  - **Live driver map**: GPS-based job browsing and acceptance
  - **Photo documentation**: Before/after photos required for job completion
  - **Ratings**: Mutual rating system post-completion
  - **Push-to-complete flow**: Driver job completion screen with celebration UI
  - **Free launch period**: No pricing shown to customers during launch
  - **Admin stats**: `GET /api/admin/stats?key=<key>` for operational metrics
  - **Role upgrade**: Customers can apply to become drivers in-app
  - **Cancel support**: Jobs can be cancelled with server enforcement
  - **Bilingual**: English + Swedish throughout

  ## Environment Variables

  See [`.env.example`](.env.example) for all required environment variables.

  ## Getting Started

  ```bash
  # Install dependencies
  pnpm install

  # Start API server (runs on $PORT)
  pnpm --filter @workspace/api-server run dev

  # Start Expo app
  pnpm --filter @workspace/bara run dev
  ```

  ## Brand

  - **Primary**: Navy `#1B2A4A`
  - **Accent**: Gold `#C9A84C`
  - **Font**: Inter (400, 500, 600, 700)

  ## License

  Private — all rights reserved.
  