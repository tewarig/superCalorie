# Roadmap

An open-source Apple Fitness, for food.

This file is the working list. It records what is decided, what is built, and
what is deliberately not being done yet — so the next session can pick up
without re-deriving any of it. Update it as things land; it is not a
changelog (see [CHANGELOG.md](CHANGELOG.md) for released versions).

Work happens directly on `main` unless a change is large enough to want a PR.

## Who this is built for, in order

1. **The mobile app is the product.** Every feature lands here first and is
   judged here. If something works on the web but not in the app, it is not
   done.
2. **The backend is first-class.** Self-hostable, documented by an OpenAPI
   spec, and usable without either front end. Someone should be able to run
   the server and build their own client against it.
3. **The web app is second-class.** It exists so a link can be opened without
   installing anything, and so the public profile has somewhere to live. It
   does not need parity, and it should not hold up app work.

This ordering settles arguments. A feature that is expensive on the web and
cheap in the app ships in the app and waits on the web.

## Decisions already made

These are settled. Reopen them only with a reason.

| Decision | Choice | Why |
| --- | --- | --- |
| Mobile navigation | Four tabs: Summary, Log, Trends, Sharing | Logging is the most frequent action and should not be a scroll down inside Summary |
| Macro targets | Percentages of the calorie goal | The goal stays the one number to think in; grams are derived, so the two can never disagree |
| Charts | Hand-rolled, **mobile only** | See "Charts" below |
| Web charting | Not now | Explicitly deferred; the web keeps its existing numeric cards until someone asks |
| Login | Optional, everywhere | The app is local-first; a server is something you opt into |
| Publishing | Opt-in per section | Nothing leaves the device until switched on; a hidden profile 404s exactly like an unclaimed handle |
| react-native-web | Not used | Web is a separate React DOM app; the design system splits `.native` / `.web` instead |

### Charts

`victory-native` needs Skia and `react-native-gifted-charts` needs
`react-native-svg`, so neither runs in the web app. That was the original
argument for hand-rolling on shared geometry.

Charts are now **mobile-only by decision**, which frees that constraint: a
native charting library is a legitimate option if the hand-rolled ones stop
paying their way. The existing components already work, are tested, and carry
no dependency, so there is no reason to switch today.

The `.web.tsx` chart builds still exist and are still correct. They are not
rendered by anything. Leave them until the web look lands, then decide.

## Now

- [x] **Macro split editor (mobile).** `src/app/goals.tsx`, reached from the
      Goals card on Summary. Presets plus per-macro adjustment; a pushed
      screen rather than a fifth tab, which would have crowded the bar.
- [x] **Onboarding on first launch (mobile).** Local / cloud instance /
      self-hosted, gating the router in `_layout.tsx`. Changeable afterwards
      from Sharing. The cloud option only appears when `EXPO_PUBLIC_HOSTED_URL`
      is set, so it is hidden until an instance is actually published.
- [ ] **Publishing from the app.** The Sharing tab has the visibility
      toggles and a preview built from the real `buildPublicStats`, but
      claiming a handle needs a server and the button says so. Wire it to
      `/api/profile` once a connection exists. Blocked on logging in from the
      app. The app is where sharing is set up; the web is only where the
      result is read.

## Next

- [x] **Macro split on the server.** A `macro_split` column on `users`,
      settable through `PATCH /api/auth/me`, carried by `/api/export`. API
      version 0.3.0. The apps do not call it yet — mobile has no login at
      all, which is the prerequisite below.
- [ ] **Log in from the app.** Nothing in `apps/mobile` authenticates: no
      sign-in screen, no token storage. `client.ts` and the bearer token in
      `AuthResult` were designed for it. This blocks publishing and any
      syncing, so it comes before either.
- [ ] **Web adopts the new look.** Summary-style layout, the shared design
      system components, and the sharing controls. Numeric cards rather than
      charts. Second-class by design: this should never block app work.
- [ ] **Retire the inline-style `Button` and `Input`** in `packages/ui`.
      They predate the design system, have no tests, and their `.native`
      builds are unused. Still live in `auth-form.tsx` and `today-card.tsx`.

## Later

- [ ] Location tagging on entries. Deliberately deferred: a public profile
      plus locations reveals home and work patterns, so it needs a privacy
      design before any code.
- [ ] Video, alongside photos, on an entry.
- [ ] Widgets and a watch app — the Apple Fitness comparison invites both.

## Constraints worth remembering

- **Node 22.5+**, because the database driver is `node:sqlite`. Run
  `nvm use` first; the default node here is older.
- **pnpm**, with `nodeLinker: hoisted` — Metro cannot follow pnpm's symlinked
  store. Switching linkers leaves stale per-package `node_modules`; delete
  them all and reinstall if resolution goes strange.
- **`pnpm turbo run typecheck lint test build` does not build the Docker
  image.** Anything touching dependency layout needs `docker build` too.
- **Coverage is enforced at 100%** in both apps. New files must be added to
  the coverage globs or they are invisible to a run that still reports 100%.
- **Verify the mobile app by bundling**, not by starting Metro: a broken
  route or a missing screen still starts cleanly.
- **Bundling is not running.** Metro resolves modules, it does not evaluate
  them, so a missing global or a bad runtime assumption survives a green
  bundle, a green typecheck and a green suite. Issue #2 was exactly this.
  Anything touching app runtime needs a device or simulator pass.
