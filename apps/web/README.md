# @supercalorie/web

Next.js 16 app serving both the web UI and the backend — auth, the food API,
and photo storage all live here. See the [root README](../../README.md) for
architecture, the API table, and deployment notes.

```sh
pnpm --filter web dev      # http://localhost:3000
pnpm --filter web test     # vitest against the real route handlers
pnpm --filter web build
```

Those work from anywhere in the repo; from this directory, `pnpm dev` does
the same.

Requires **Node 22.5+** — `node:sqlite` does not exist before it, and the
scripts stop with an explanatory message on an older runtime.

Copy `.env.example` to `.env.local` before running. `SESSION_SECRET` is
required in production. `USDA_API_KEY` is optional, but without it the food
search falls back to a heavily rate-limited demo key.
