/*
 * rootDir is the workspace root, not this app.
 *
 * The design system it renders lives in packages/ui, and `collectCoverageFrom`
 * globs are matched relative to rootDir with no `<rootDir>` substitution — so
 * with rootDir here, every pattern reaching outside apps/mobile matched
 * nothing. Jest then reported "0 files, 0%" and the 100% threshold passed
 * vacuously, which looks identical to success.
 */
module.exports = {
  preset: "jest-expo",
  rootDir: "../..",
  roots: ["<rootDir>/apps/mobile/src", "<rootDir>/packages/ui/src"],
  setupFilesAfterEnv: ["<rootDir>/apps/mobile/jest.setup.js"],
  coverageDirectory: "<rootDir>/apps/mobile/coverage",
  // v8, not the default babel provider: jest-expo's transform does not
  // instrument files outside the app directory, so with babel the design
  // system reported 0 files and the threshold below passed on nothing.
  // v8 measures what actually executed, and it matches the web app's setup.
  coverageProvider: "v8",
  collectCoverageFrom: [
    "packages/ui/src/{activity-rings,app-button,bar-chart,calorie-dial,food-row,heatmap,section-heading,segmented-control,surface}/**/*.{ts,tsx}",
    "!**/*.stories.tsx",
    // The web builds are React DOM. This runner cannot render them, so
    // measuring them here would report a gap it has no way to close.
    "!**/*.web.tsx",
    // Type-only modules. Their imports are erased at compile time, so v8
    // never sees them execute and reports 0% for files with no runtime code.
    "!**/segmented-control/types.ts",
  ],
  coverageThreshold: { global: { branches: 100, functions: 100, lines: 100, statements: 100 } },
};
