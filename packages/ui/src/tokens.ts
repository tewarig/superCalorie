/**
 * superCalorie design tokens.
 *
 * Platform-agnostic values consumed by both the web (React DOM) and
 * native (React Native) component implementations. Keep everything here
 * serializable — no CSS strings, no platform APIs.
 */

export const palette = {
  // Warm paper / cream neutrals
  cream: "#FAF5EC",
  parchment: "#F3ECDD",
  sand: "#E7DCC6",

  // Ink (deep green-black)
  ink: "#1C2A24",
  inkSoft: "#44544C",
  inkFaint: "#7A877F",

  // Brand greens
  leaf: "#2F6B4F",
  leafDeep: "#1F4A36",
  leafBright: "#3E8A66",
  mint: "#DFEDE4",

  // Accents
  tangerine: "#E8641C",
  tangerineSoft: "#FBE3D2",
  berry: "#A63D57",
  honey: "#E3A82B",

  // Feedback
  success: "#2F6B4F",
  warning: "#E3A82B",
  danger: "#C13F2E",

  white: "#FFFFFF",
} as const;

export const color = {
  background: palette.cream,
  surface: palette.white,
  surfaceMuted: palette.parchment,
  border: palette.sand,

  text: palette.ink,
  textMuted: palette.inkSoft,
  textFaint: palette.inkFaint,
  textOnDark: palette.cream,

  primary: palette.leaf,
  primaryPressed: palette.leafDeep,
  primarySubtle: palette.mint,
  accent: palette.tangerine,
  accentPressed: "#C9520F",
  accentSubtle: palette.tangerineSoft,

  danger: palette.danger,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  display: 44,
} as const;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

/** Nutrition-specific semantic colors (macros, calorie states). */
export const nutrition = {
  calories: palette.tangerine,
  protein: palette.berry,
  carbs: palette.honey,
  fat: palette.leafBright,
} as const;

export type ColorToken = keyof typeof color;
export type SpaceToken = keyof typeof space;
