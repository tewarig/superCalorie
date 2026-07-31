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
- [x] **Publishing from the app.** Claims a handle and saves visibility
      against `/api/profile`, loading current state from the server rather
      than guessing. `isPublic` is a separate master switch.
- [ ] **Avatar upload from the app.** The only part of publishing still
      missing; needs the photo endpoint wired from mobile.
- [ ] **Summary screen visual pass (mobile).** The log button has moved to the
      bottom right, where the thumb actually is, and the spacing values now go
      through the design tokens. What is still wrong is the composition rather
      than the numbers: the eyebrow-plus-title header, the dark rings card, the
      Goals row and the two chart sections all carry similar weight, so nothing
      leads and the screen reads flat and cramped. Deferred on purpose — it
      wants a design decision about hierarchy, not another round of nudging
      padding. Do this before "Web adopts the new look", so the web copies a
      layout worth copying.
- [ ] **Dedupe Heatmap grid geometry.** `packages/ui/src/heatmap/`. `CELL`/`GAP`
      and the label-gutter width live as constants in `Heatmap.native.tsx` but
      are restated as literal Tailwind classes (`h-[11px]`, `pl-8`, `gap-[3px]`,
      …) in `Heatmap.web.tsx`, so the two can drift. Move the shared numbers
      into `geometry.ts` and read them from both. Also pull the two palette
      endpoints of `LEVEL_COLOURS`/`LEVEL_COLOURS_NATIVE` from the design
      tokens instead of restating their hexes — the three interpolated greens
      in between are heatmap-specific and can stay literal. In progress in a
      background session (task_7d43f18f).
- [ ] **Extract the eyebrow-label component.** The small uppercase label above
      a screen title (`text-label uppercase tracking-label text-muted`, plus a
      darker `tracking-eyebrow`/`text-dial-muted` variant on the ink cards) is
      copy-pasted across `(tabs)/index.tsx`, `(tabs)/trends.tsx`,
      `(tabs)/sharing.tsx`, `goals.tsx`, `log.tsx`, `onboarding.tsx`, and the
      calorie dial. Wants a component next to `SectionHeading` in
      `packages/ui/src/section-heading/`, same `.native`/`.web` split, with a
      tone prop for the light/dark cases rather than two components. In
      progress in a background session (task_1fe2888f).

## Next

- [x] **Macro split on the server.** A `macro_split` column on `users`,
      settable through `PATCH /api/auth/me`, carried by `/api/export`. API
      version 0.3.0. The apps do not call it yet — mobile has no login at
      all, which is the prerequisite below.
- [ ] **Offline-first sync (mobile).** The app already works fully offline —
      the on-device snapshot is the source of truth and every screen reads it.
      What is missing is reconciling that with a server when one is
      configured. Sketch, so this is not redesigned from scratch: entries are
      already immutable rows with a stable UUID and a `createdAt`, and
      `mergeEntries` dedupes by id and now honours tombstones, so a first cut
      is push-new, pull-since, last-write-wins on the profile. Server-side it
      is a bulk `POST` for pushing local work up. Mobile only — the web talks
      to the server directly and is second-class.

      Done already: the `Deletion` tombstone in the snapshot (version 3), so
      importing a backup no longer resurrects a deleted entry; the server's
      `entry_deletions` table; and `GET /api/entries?since=` returning
      changes plus tombstones with a server-clock watermark. What is left is
      the push half — a bulk `POST` — and the loop that drives it from the
      app. Logging in is done, so nothing blocks this now. In progress in a
      background session (task_baa55039).
- [x] **Log in from the app.** `src/app/sign-in.tsx` and `src/lib/session.ts`.
      Token in the keychain, verified against the server on launch, cleared
      locally even if sign-out fails. Signing in moves no data yet — that is
      the sync loop.
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
