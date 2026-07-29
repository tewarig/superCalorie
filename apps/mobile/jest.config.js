module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  collectCoverageFrom: ["src/components/ui/**/*.{ts,tsx}", "!src/components/ui/**/*.stories.tsx", "!src/components/ui/index.ts"],
  coverageThreshold: { global: { branches: 100, functions: 100, lines: 100, statements: 100 } },
};
