# superCalorie

A calm calorie tracker. Turborepo monorepo with a native mobile app, a separate web app, and a shared design system — **no react-native-web**: each platform renders with its own primitives.

## Layout

```
apps/
  mobile/    Expo (SDK 57) — iOS & Android, expo-router
  web/       Next.js 16 — web UI + the backend (auth & API live here)
packages/
  ui/        @supercalorie/ui — design tokens + components with
             platform-native implementations (Button.web.tsx / Button.native.tsx)
```

The design system exposes each component through the package `exports` map:

```jsonc
"./button": {
  "react-native": "./src/button/Button.native.tsx", // Metro (Expo) picks this
  "default": "./src/button/Button.web.tsx"          // Next.js picks this
}
```

Both implementations share one `ButtonProps` contract and one `tokens.ts`, so call sites are identical on every platform.

## Getting started

```sh
npm install

npm run dev:web      # Next.js on http://localhost:3000
npm run dev:mobile   # Expo dev server (press i / a for iOS / Android)
npm run dev          # both, via turbo

npm run build        # build all workspaces
npm run typecheck    # tsc across all workspaces
npm run lint
```

## Backend (apps/web)

Auth + data API as Next.js route handlers. Sessions are HMAC-signed httpOnly cookies; passwords are scrypt-hashed. Storage is an in-memory placeholder (`src/lib/db.ts`) meant to be swapped for a real database.

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/health` | GET | liveness check |
| `/api/auth/signup` | POST | `{ email, password, name? }` → creates account + session |
| `/api/auth/login` | POST | `{ email, password }` → session cookie |
| `/api/auth/logout` | POST | clear session |
| `/api/auth/me` | GET | current user |
| `/api/entries` | GET/POST | list (`?date=YYYY-MM-DD`) / log food entries |
| `/api/entries/:id` | DELETE | remove an entry |

Set `SESSION_SECRET` in production; the dev fallback rotates per process.
