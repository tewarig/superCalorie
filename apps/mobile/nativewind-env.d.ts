/// <reference types="nativewind/types" />

/**
 * Declares the side-effect import of `global.css` in the root layout.
 *
 * `expo/types` already provides this, but it reaches TypeScript through
 * `expo-env.d.ts` — a file Expo generates and tells you to gitignore. A
 * fresh checkout has no such declaration, so typecheck fails in CI while
 * passing on any machine that has run Expo once. Declaring it here, in a
 * file that is committed, makes the result the same everywhere.
 */
declare module "*.css" {
  const content: string;
  export default content;
}
