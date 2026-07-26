# @supercalorie/mobile

Expo (SDK 57) app for iOS and Android, using expo-router. It renders with
real React Native primitives — there is no react-native-web here; the web app
is a separate Next.js project. See the [root README](../../README.md) for how
one design system serves both.

```sh
pnpm --filter mobile dev     # then press i (iOS) or a (Android)
pnpm --filter mobile lint
```

The app talks to the Next.js backend, so **start the web app first** — there
is no local store to fall back on. It defaults to `localhost:3000` on the iOS
simulator and `10.0.2.2:3000` on the Android emulator. On a physical device,
point it at your machine:

```sh
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000 pnpm --filter mobile dev
```

The login screen prints whichever URL it resolved along the bottom, so a
misconfigured address is obvious rather than mysterious.
