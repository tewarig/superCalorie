# Changelog

Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Three things version separately, on purpose:**

| What | Where | Bumps when |
| --- | --- | --- |
| The release | this file, git tags `vX.Y.Z` | anything ships |
| The API contract | `info.version` in `/api/openapi.json` | an endpoint changes shape |
| The export format | `version` inside a `Snapshot` | a saved file stops being readable by the old parser |

An integration pins the API version, not the release. The two move at
different speeds — plenty of releases touch only the apps, and pinning those
to the release number would force integrators to re-check a contract that
never moved.

Until `1.0.0`, minor versions may break things; after it, they may not.

<!--
Cutting a release:
  1. Move everything under Unreleased into a new version heading, dated.
  2. Bump `version` in the root package.json to match.
  3. If any endpoint changed, bump API_VERSION in apps/web/src/lib/openapi.ts.
  4. git tag -a vX.Y.Z -m "vX.Y.Z" && git push origin vX.Y.Z

The tag triggers .github/workflows/release.yml, which verifies the tree,
publishes the image to GHCR, and opens a GitHub release using the section
below. It fails if this file has no section for the version — a release with
no notes is worse than a delayed one.
-->

## [Unreleased]

Nothing yet.

## [0.1.0] - 2026-07-29

First release. The apps are usable on their own; the backend is optional.

### Added

- **Local-first tracking.** Both apps store everything on the device and work
  with no account, no connection, and no server. Log food, edit your goal,
  move between days, attach photos — all offline.
- **Import and export.** JSON keeps everything and is the backup format; CSV
  is one row per entry for spreadsheets. Import is additive and idempotent,
  so re-importing a file changes nothing and restoring an old backup onto a
  device with newer entries keeps both.
- **Food search across three sources.** A curated library of ~60 Indian and
  Western staples answers instantly and offline; USDA fills in generic whole
  foods and Open Food Facts covers packaged products. Each result shows where
  its numbers came from, because a lab measurement and a crowd-sourced label
  are not equally trustworthy.
- **Meal photos.** Capture or pick an image when logging; it appears as a
  thumbnail on the entry.
- **Optional backend** for syncing between devices and backing up, with
  cookie sessions for browsers and bearer tokens for everything else.
- **Published API.** OpenAPI 3.1 at `/api/openapi.json`, browsable at
  `/api-docs`. `GET /api/export` returns an entire account in the same shape
  the apps store locally, so data put in can always be taken out.
- **Self-hosting.** A multi-stage `Dockerfile` (~212 MB, non-root, healthcheck,
  data on a volume) and a `docker-compose.yml`. Images publish to GHCR for
  amd64 and arm64.
- **Shared design system** with genuinely native rendering per platform — no
  react-native-web; one props contract with separate React DOM and React
  Native implementations.

### Notes

- Requires Node 22.5+, the floor for `node:sqlite`. The scripts stop with an
  explanatory message on anything older.
- `SESSION_SECRET` is required in production; the backend refuses to issue a
  session without it rather than signing with a key that dies on restart.
- Expo Go cannot open the mobile app while its App Store build trails SDK 57.
  Use `eas go`, a simulator, or a development build.

[Unreleased]: https://github.com/tewarig/superCalorie/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/tewarig/superCalorie/releases/tag/v0.1.0
