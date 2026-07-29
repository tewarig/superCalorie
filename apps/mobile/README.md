# superCalorie mobile

The Expo app is local-first: food logs, photos, imports, and exports work without an account or network connection.

## Commands

- `pnpm --filter mobile start` starts the tracker.
- `pnpm --filter mobile storybook` starts the on-device component workshop. It is intentionally excluded from normal app bundles.
- `pnpm --filter mobile test` runs the NativeWind component suite with a strict 100% coverage gate for `src/components/ui`.

## Design system

Mobile components live in `src/components/ui` and use NativeWind v4 with the `field notebook` token set in `tailwind.config.js`. New mobile controls should be composed from these primitives and should include a colocated `*.stories.tsx` file and test.
