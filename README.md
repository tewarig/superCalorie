# superCalorie

A calm calorie tracker. Turborepo monorepo with a native mobile app, a separate web app, and a shared design system — **no react-native-web**: each platform renders with its own primitives.

## The V1 feature: the logging loop

Everything in V1 serves one loop — **open the app, find what you ate in seconds, see what's left today**. Charts, streaks, and AI estimation are layers on top of that loop, not substitutes for it.

- **Searchable food library.** ~60 curated foods (Indian and Western staples) answer instantly and offline, ranked so prefix matches win — typing `ban` surfaces *Banana*, not *Whole wheat bread*. When the library runs thin, USDA and Open Food Facts fill in behind it.
- **One-tap logging.** Pick a meal (defaulted by time of day), hit **Add** for a full serving or **½** for half. Macros scale with quantity.
- **Your usuals.** With an empty search box the app returns your most-logged foods, so the common case needs zero typing.
- **Honest totals.** A calorie ring plus macro bars against targets derived from your goal (30/40/30 split).
- **Meal photos.** Snap or pick a picture when you log; it shows as a thumbnail on the entry.
- **No account, no server.** Everything is stored on your device and works offline. Export as JSON or CSV whenever you like, and sync through the optional backend only if you want to.

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

One caveat: the tokens are mirrored by hand as CSS variables in `apps/web/src/app/globals.css` so Tailwind can see them. Change a colour in `tokens.ts` and you must change it there too — a codegen step should replace this.

## Getting started

**Node 22.5+ is required** — it's the floor for `node:sqlite`, which the backend uses for persistence. (Next.js 16 separately needs ≥20.9.) An `.nvmrc` pins the major version:

```sh
nvm use        # or: nvm install 22
```

On Node 22 the SQLite driver is still behind `--experimental-sqlite`, so the flag is baked into the web app's package scripts via `NODE_OPTIONS`. It becomes unnecessary on Node 24+, at which point those scripts can be simplified.

This repo uses **pnpm** (pinned via `packageManager`, so `corepack enable` gets you the right version):

```sh
pnpm install

pnpm dev:web      # Next.js on http://localhost:3000
pnpm dev:mobile   # Expo dev server (press i / a for iOS / Android)
pnpm dev          # both, via turbo

pnpm build        # build all workspaces
pnpm test         # vitest: domain logic, snapshots, API routes, OpenAPI drift
pnpm typecheck    # tsc across all workspaces
pnpm lint
```

Then open http://localhost:3000/today and start logging — there is no sign-up step, and the backend can be switched off entirely.

If you forget to switch Node versions, the web app's scripts stop with an explicit message rather than the misleading `--experimental-sqlite is not allowed in NODE_OPTIONS` you'd otherwise get from Node 20.

### Pointing the mobile app at the backend

Defaults to `localhost:3000` (iOS simulator) and `10.0.2.2:3000` (Android emulator). On a **physical device**, set your machine's LAN address:

```sh
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000 pnpm dev:mobile
```

The app works with no backend at all, so this only matters once you want server sync.

## Storage: local first

Both apps keep everything on the device and need no account, no connection, and no server. One `Snapshot` document holds the profile, every entry, and any foods you added yourself — and that same document *is* the export format, so backing up is writing the store out and restoring is reading one in.

| | Document | Photos |
| --- | --- | --- |
| Web | `localStorage` | IndexedDB |
| Mobile | `expo-file-system` | files beside it |

Photos stay out of the document because base64 in `localStorage` would exhaust the quota after a few meals.

Import is additive and idempotent: entries match on id, so re-importing a file changes nothing, and restoring an old backup onto a device with newer entries keeps both. An imported profile never overwrites a goal you set on this device.

## Backend (apps/web) — optional

The API exists for syncing between devices, keeping a backup, and letting other tools build on your data. **Nothing in the apps requires it.**

It's Next.js route handlers over SQLite via Node's built-in `node:sqlite` — no native module to compile. The database lands in `apps/web/.data/` and seeds the food library on first run.

Sessions work over two transports: an httpOnly cookie for browsers, and an `Authorization: Bearer` token for anything without a dependable cookie jar. Passwords are scrypt-hashed; tokens are HMAC-signed.

### API reference

The contract is published as OpenAPI 3.1, versioned independently of the app:

- **`/api-docs`** — browsable reference
- **`/api/openapi.json`** — the specification, unauthenticated so you can point a client generator straight at it

```sh
npx @hey-api/openapi-ts -i http://localhost:3000/api/openapi.json -o ./generated
```

`tests/openapi.test.ts` asserts the spec matches the routes that actually exist — every route documented, every documented route real, matching methods. A hand-written spec drifts the moment someone forgets, and a stale contract published to integrators is worse than none.

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/health` | GET | liveness check |
| `/api/auth/signup` | POST | `{ email, password, name? }` → account + session |
| `/api/auth/login` | POST | `{ email, password }` → session |
| `/api/auth/logout` | POST | clear session |
| `/api/auth/me` | GET / PATCH | current user / update calorie goal |
| `/api/foods` | GET | `?q=` searches the library, USDA, and Open Food Facts; no query returns your most-logged foods |
| `/api/entries` | GET / POST | a day's log with totals / log food by `foodId` or as a custom entry |
| `/api/entries/:id` | DELETE | remove an entry |
| `/api/photos` | POST | upload a meal photo (multipart, field `photo`) → `photoId` |
| `/api/photos/:id` | GET | stream a photo back, scoped to its owner |
| `/api/export` | GET | the whole account as one `Snapshot` |
| `/api/import` | POST | merge a `Snapshot` in; additive and idempotent |
| `/api/openapi.json` | GET | this API's specification (public) |

`/api/export` returns the same shape the apps store locally, so a server export imports straight into a device and back again. Storing data here never costs you the ability to take it elsewhere.

### Self-hosting

The backend ships as a container — non-root, ~212 MB, with the database and
photos on a volume so a redeploy doesn't wipe every account.

```sh
echo "SESSION_SECRET=$(openssl rand -hex 32)" > .env
docker compose up -d
```

Or pull a published image instead of building (amd64 and arm64):

```sh
docker run -d -p 3000:3000 -v supercalorie-data:/data \
  -e SESSION_SECRET=$(openssl rand -hex 32) \
  ghcr.io/tewarig/supercalorie:latest
```

**Back up the `/data` volume.** It holds the database and every photo; the
image contains nothing of yours. `GET /api/export` is the other half of that
— one request for everything, in a format the apps can read back.

Copy `apps/web/.env.example` to `.env.local`. **`SESSION_SECRET` is required in production** — the app refuses to boot without it. In development a secret is generated once and cached in `.data/` so restarts don't log you out.

`DATABASE_PATH` overrides where the SQLite file lives, and accepts `:memory:` for an ephemeral database.

### Poking at it by hand

```sh
curl -s localhost:3000/api/health

# Sign up and keep the token
TOKEN=$(curl -s localhost:3000/api/auth/signup \
  -H 'content-type: application/json' \
  -d '{"email":"me@example.com","password":"password123","name":"Me"}' \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["token"])')

curl -s localhost:3000/api/auth/me -H "authorization: Bearer $TOKEN"
curl -s "localhost:3000/api/foods?q=paneer" -H "authorization: Bearer $TOKEN"

# Log two bananas to breakfast, then read the day back
FOOD=$(curl -s "localhost:3000/api/foods?q=banana" -H "authorization: Bearer $TOKEN" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["foods"][0]["id"])')
curl -s localhost:3000/api/entries -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d "{\"foodId\":\"$FOOD\",\"quantity\":2,\"meal\":\"breakfast\",\"date\":\"$(date +%F)\"}"

curl -s "localhost:3000/api/entries?date=$(date +%F)" -H "authorization: Bearer $TOKEN"
```

## Notes on the data layer

`src/lib/db.ts` owns the schema and connection; `src/lib/repo.ts` is the only file that knows SQL. Everything above speaks the shared types from `@supercalorie/core`, so swapping SQLite for Postgres means rewriting `repo.ts` and nothing else.

Entry macros are **denormalized at log time** — correcting a food in the library never silently rewrites what you ate last week.

## Testing

```sh
pnpm test                      # everything
pnpm --filter web test         # just the web app
pnpm --filter web test:watch
```

Vitest in a `node` environment, importing the real route handlers — no HTTP server, no mocked database. Each test file gets its own `:memory:` SQLite database via `DATABASE_PATH`, created and seeded and discarded with the file, so no test file can leak state into another.

Two things are stubbed. `fetch` is blocked by default, so no test reaches USDA or Open Food Facts — the suite would otherwise be slow and hostage to two third parties; `food-providers.test.ts` drives the merge with fixtures instead. The other is `next/headers`, since `cookies()` only exists inside a real request scope. `tests/request-cookies.ts` reproduces that scope with an `AsyncLocalStorage`: a store belongs to exactly one request, reads see only the cookies that request arrived with, and writes come back as `Set-Cookie`. Calling a handler outside that scope gets an empty store.

That per-request boundary is the point. A single shared jar would let a cookie set during setup leak into a later request meant to be anonymous — which passes the test for the wrong reason. Here, the "401s with no credentials" test genuinely sends no credentials, and both transports get real coverage: the cookie path through `call()`, the bearer path with no mocking at all.

| File | Covers |
| --- | --- |
| `tests/auth.test.ts` | signup validation and email normalisation, duplicate accounts, login, logout, cookie *and* bearer resolution, forged-signature rejection, goal bounds |
| `tests/entries.test.ts` | macro scaling by quantity, custom entries, day totals and `remaining`, per-day scoping, cross-user delete isolation, every validation bound |
| `tests/foods.test.ts` | search ranking, case-insensitivity, empty results, starter fallback, most-logged ordering |
| `tests/core.test.ts` | `macroTargets`, `todayISO` local-timezone behaviour, `formatDateLabel`, `sumTotals` |

Two behaviours are pinned by tests specifically because they're easy to regress and quiet when broken:

- **Dates are local, never UTC.** A meal logged at 11pm belongs to that day. Clients compute the date string and send it; the server only falls back to its own clock when one is missing.
- **Deletes are user-scoped.** `DELETE /api/entries/:id` filters on `user_id` as well as `id`, so one account cannot delete another's entries.

Not yet covered: React components, and the Expo app (no test runner in `apps/mobile`).

## Releases

Versions follow [semver](https://semver.org), and three things version
separately on purpose: the release (git tags `vX.Y.Z`), the API contract
(`info.version` in the spec), and the export format (`version` in a
`Snapshot`). Integrations pin the API version, not the release — most
releases don't touch the contract, and coupling them would force integrators
to re-check something that never moved.

Cutting one is pushing a tag:

```sh
git tag -a v0.2.0 -m "v0.2.0" && git push origin v0.2.0
```

That runs [`release.yml`](.github/workflows/release.yml): it verifies the
tree, publishes multi-arch images to GHCR, and opens a GitHub release from
the matching [CHANGELOG.md](CHANGELOG.md) section — failing if that section
is missing, because a release with no notes is worse than a late one.

Mobile binaries are a separate, manual workflow
([`release-mobile.yml`](.github/workflows/release-mobile.yml)), since they
need an Expo account and take far longer than an image build. It produces an
installable Android APK and can attach artifacts to a release. iOS needs a
paid Apple Developer account with credentials in EAS; without one the preview
profile still yields a Simulator build.

| Secret / variable | Needed for |
| --- | --- |
| `EXPO_TOKEN` (secret) | any mobile build |
| `EXPO_PUBLIC_API_URL` (variable) | pointing a build at your backend |

`GITHUB_TOKEN` is provided automatically and covers both GHCR and releases.

## Deploying

### On a Node host — works with the code as it stands

SQLite lives on disk, so this wants a host with a **persistent volume** and a single instance. Fly.io, Railway, Render, or any VPS all work.

```sh
pnpm build
SESSION_SECRET=$(openssl rand -hex 32) \
DATABASE_PATH=/data/supercalorie.db \
  pnpm --filter web start
```

Point `DATABASE_PATH` at the mounted volume, not into the app directory, or a redeploy will wipe every account. Treat `SESSION_SECRET` as a real secret — rotating it invalidates every existing session.

For mobile, `eas build` produces store builds; set `EXPO_PUBLIC_API_URL` to the deployed origin. Note that `app.json` has no `ios.bundleIdentifier` or `android.package` yet, and EAS will ask for both.

### On Cloudflare Workers — needs migration work first

> **There is no Cloudflare setup in this repository.** No `wrangler.jsonc`, no `@opennextjs/cloudflare`, no `open-next.config.ts`, no D1 bindings. What follows is the work required, not a description of what exists.

The blocker is storage, and it's the only real one. Workers has **no `node:sqlite`** and no persistent filesystem, so `src/lib/db.ts` — `DatabaseSync`, a file path, `mkdirSync`, WAL pragmas — cannot run there. The replacement is **D1**, which is SQLite and speaks nearly the same SQL, but whose API is **`async`-only**.

That async requirement is the bulk of the effort. `src/lib/repo.ts` is written against a synchronous driver, so `users.byId`, `foods.search`, `entries.forDay` and friends all become `Promise`-returning, and every call site — including `getSessionUser()` and each route handler — has to await them.

The good news, checked against the Workers runtime rather than assumed: **the crypto ports over unchanged.** `scryptSync`, `createHmac`, `randomBytes`, `timingSafeEqual` and `randomUUID` are all supported under `nodejs_compat` (`scrypt` landed in the runtime on 2024-07-03), so password hashing and session signing need no rewrite.

Roughly:

1. `pnpm add @opennextjs/cloudflare --filter web` and `pnpm add -D wrangler --filter web`.
2. Add `wrangler.jsonc` with `nodejs_compat`, a recent `compatibility_date`, and a D1 binding (say `DB`). Add a KV namespace for the incremental cache if you want ISR.
3. Call `initOpenNextCloudflareForDev()` in `next.config.ts` so `getCloudflareContext()` works under `next dev`.
4. Move the `CREATE TABLE` statements out of `connect()` into a real migration (`wrangler d1 migrations create`) — D1 has migrations, and you no longer want DDL running on first query. Seed the food library as a migration too.
5. Rewrite `db.ts` to return `getCloudflareContext().env.DB`, convert `repo.ts` to `async`, then follow the type errors outward through the routes.
6. Replace the on-disk dev-secret cache in `auth.ts` with `wrangler secret put SESSION_SECRET` — the Workers `node:fs` is a virtual filesystem whose `/tmp` is wiped between requests.
7. Scripts: `"preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview"` and `"deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"`.

Test with `pnpm --filter web preview` (real workerd, local D1) before deploying.

The test suite is a genuine asset here: the tests drive the routes rather than the driver, so once `repo.ts` is async they tell you whether the port preserved behaviour.

## Known gaps

Honest list, roughly by how much they'd bite in production:

- **Sessions can't be revoked.** Tokens are stateless HMACs. `logout` clears the cookie and the mobile keychain, but a leaked bearer token stays valid for its full 30 days. A revocation table, or short-lived access tokens plus refresh, would fix it.
- **No rate limiting on `/api/auth/login`.** Nothing slows down credential stuffing.
- **`token` is returned to the web client too**, in the signup and login JSON, where the httpOnly cookie already does the job. Mobile needs it; the browser doesn't.
- **Entries can't be edited**, only deleted and re-added — there's no `PATCH /api/entries/:id`.
- **The calorie goal has no UI.** `PATCH /api/auth/me` works and the client method exists, but nothing calls it, so every account sits at the 2000 kcal default.
- **No history.** The API serves one day at a time; there's no week or month view, even though `idx_entries_user_date` would make it cheap.
- **Search wildcards aren't escaped** — a `%` in the query goes straight into the `LIKE` pattern.
- **The food library is global.** `foods` has no `user_id`, so users can't save their own foods, and custom entries are one-offs that can't be reused.
- **Macro targets aren't user-settable** — derived from the calorie goal on a fixed 30/40/30 split. Deliberate, so the two numbers can never disagree.

## What's next

Ordered by leverage — how much the app improves per unit of work, given what's already here.

**Cheap wins, mostly wiring**

1. **A settings screen for the calorie goal.** Endpoint, validation, and `updateGoal()` all exist. UI only, and it unblocks the app's central number.
2. **Edit an entry.** Add `PATCH /api/entries/:id`; the day view already has the row UI to hang it on.
3. **Weekly history and trends.** One endpoint over a date range, then a 7-day strip and an average. The index is already there.
4. **Repeat a meal.** "Log yesterday's breakfast again" in one tap — a `GROUP BY date, meal` query and a button. Unusually high value for the code involved.

**Features with real substance**

5. **Photo logging with Claude.** Point the camera at a plate, get name and macro estimates back to confirm. A `POST /api/foods/estimate` route calling `claude-sonnet-5` with the image, returning the same `Food` shape the library already uses, so it drops straight into the existing log flow. The most differentiating feature available here — and the honest UX is *estimate, then confirm*, never silent logging.
6. **Barcode scanning.** `expo-camera` plus an Open Food Facts lookup behind the existing `/api/foods` contract — which `foods-seed.ts` already anticipates in its header comment.
7. **User-owned foods.** Add a nullable `user_id` to `foods` (null = global), then "save as my food" from a custom entry. Turns one-off entries into reusable ones and makes search results personal.
8. **Offline-first mobile.** Queue writes locally and reconcile on reconnect. People log food on the subway.
9. **A TDEE calculator** to set the goal from height, weight, age, and activity, instead of guessing at 2000.

**Longer horizon**

10. **Water and weight tracking** — the same entry-shaped pattern, two more tabs.
11. **Gentle nudges** via `expo-notifications`, in keeping with the no-gamified-guilt tone: a reminder if nothing's logged by 9pm, not a streak you can break.
12. **Apple Health / Google Fit** sync, and a CSV export.
13. **A real food database** behind `/api/foods` — USDA FoodData Central or Open Food Facts — keeping the seed list as the fast path for common items.

If the Cloudflare migration is happening, do items 1–4 *after* it rather than before: they all touch `repo.ts`, and porting that file twice is the one genuinely avoidable cost here.
