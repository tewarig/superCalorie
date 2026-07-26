# superCalorie

A calm calorie tracker. Turborepo monorepo with a native mobile app, a separate web app, and a shared design system — **no react-native-web**: each platform renders with its own primitives.

## The V1 feature: the logging loop

Everything in V1 serves one loop — **open the app, find what you ate in seconds, see what's left today**. Charts, streaks, and AI estimation are layers on top of that loop, not substitutes for it.

- **Searchable food library.** ~60 seeded foods (Indian and Western staples), ranked so prefix matches win — typing `ban` surfaces *Banana*, not *Whole wheat bread*.
- **One-tap logging.** Pick a meal (defaulted by time of day), hit **Add** for a full serving or **½** for half. Macros scale with quantity.
- **Your usuals.** With an empty search box the app returns your most-logged foods, so the common case needs zero typing.
- **Honest totals.** A calorie ring plus macro bars against targets derived from your goal (30/40/30 split).
- **Same account everywhere.** Log lunch on the phone, see it on the laptop.

## Layout

```
apps/
  mobile/    Expo (SDK 57) — iOS & Android, expo-router
  web/       Next.js 16 — web UI + the backend (auth & API live here)
packages/
  core/      @supercalorie/core — domain types, date helpers, and the
             HTTP client both apps use
  ui/        @supercalorie/ui — design tokens + components with
             platform-native implementations
```

The design system exposes each component through the package `exports` map:

```jsonc
"./button": {
  "react-native": "./src/button/Button.native.tsx", // Metro (Expo) picks this
  "default": "./src/button/Button.web.tsx"          // Next.js picks this
}
```

Both implementations share one props contract and one `tokens.ts`, so call sites are identical on every platform.

## Getting started

Requires **Node 22+** (Next 16 needs ≥20.9; `node:sqlite` needs the flag baked into the scripts). There's an `.nvmrc` — run `nvm use`.

```sh
npm install

npm run dev:web      # Next.js on http://localhost:3000
npm run dev:mobile   # Expo dev server (press i / a for iOS / Android)
npm run dev          # both, via turbo

npm run build        # build all workspaces
npm run typecheck    # tsc across all workspaces
npm run lint
```

Then open http://localhost:3000, create an account, and start logging.

### Pointing the mobile app at the backend

Defaults to `localhost:3000` (iOS simulator) and `10.0.2.2:3000` (Android emulator). On a **physical device**, set your machine's LAN address:

```sh
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000 npm run dev:mobile
```

## Backend (apps/web)

Auth and data live in Next.js route handlers, backed by SQLite through Node's built-in `node:sqlite` driver — no native module to compile. The database file lands in `apps/web/.data/` and seeds the food library on first run.

Sessions work over two transports: the web app uses an httpOnly cookie, the mobile app an `Authorization: Bearer` token kept in the device keychain (React Native has no dependable shared cookie jar). Passwords are scrypt-hashed; tokens are HMAC-signed.

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/health` | GET | liveness check |
| `/api/auth/signup` | POST | `{ email, password, name? }` → account + session |
| `/api/auth/login` | POST | `{ email, password }` → session |
| `/api/auth/logout` | POST | clear session |
| `/api/auth/me` | GET / PATCH | current user / update calorie goal |
| `/api/foods` | GET | `?q=` searches the library; no query returns your most-logged foods |
| `/api/entries` | GET / POST | a day's log with totals / log food by `foodId` or as a custom entry |
| `/api/entries/:id` | DELETE | remove an entry |

Copy `apps/web/.env.example` to `.env.local`. **`SESSION_SECRET` is required in production** — the app refuses to boot without it. In development a secret is generated once and cached in `.data/` so restarts don't log you out.

## Notes on the data layer

`src/lib/db.ts` owns the schema and connection; `src/lib/repo.ts` is the only file that knows SQL. Everything above speaks the shared types from `@supercalorie/core`, so swapping SQLite for Postgres means rewriting `repo.ts` and nothing else.

Entry macros are **denormalized at log time** — correcting a food in the library never silently rewrites what you ate last week.

## What's next

Roughly in priority order: barcode scanning and a real food database (Open Food Facts); weekly history and trends; weight tracking; a TDEE calculator to set the goal; AI meal estimation from a photo or "2 rotis and dal"; offline-first sync on mobile.
