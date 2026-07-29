/**
 * superCalorie design tokens.
 *
 * Platform-agnostic values consumed by both the web (React DOM) and
 * native (React Native) component implementations. Keep everything here
 * serializable — no CSS strings, no platform APIs.
 *
 * The colours are read from ../theme.cjs rather than restated, so the
 * inline-style components and the Tailwind/NativeWind components cannot end
 * up on different palettes.
 */
import { flatColors } from "../theme.cjs";

const hex = flatColors();

export const palette = {
  // Warm paper neutrals
  canvas: hex.canvas,
  paper: hex.paper,
  line: hex.line,

  // Ink (deep green-black)
  ink: hex.ink,
  muted: hex.muted,

  // Brand greens
  moss: hex.moss,
  mossDeep: hex["moss-deep"],
  mossPale: hex["moss-pale"],

  // Accents
  citrus: hex.citrus,
  citrusPale: hex["citrus-pale"],
  berry: hex.berry,
  berryPale: hex["berry-pale"],
  grain: hex.grain,
  grainPale: hex["grain-pale"],

  white: "#FFFFFF",
} as const;

export const color = {
  background: palette.canvas,
  surface: palette.paper,
  surfaceMuted: palette.mossPale,
  border: palette.line,

  text: palette.ink,
  textMuted: palette.muted,
  // The shared palette has one muted tone, so the old faint tier collapses
  // into it. Placeholders read a little darker than before as a result.
  textFaint: palette.muted,
  textOnDark: palette.paper,

  primary: palette.moss,
  primaryPressed: palette.mossDeep,
  primarySubtle: palette.mossPale,
  accent: palette.citrus,
  accentPressed: "#C9520F",
  accentSubtle: palette.citrusPale,

  danger: palette.berry,
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
  control: 18,
  card: 28,
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
  calories: palette.citrus,
  protein: palette.berry,
  carbs: palette.grain,
  fat: palette.moss,
} as const;

export type ColorToken = keyof typeof color;
export type SpaceToken = keyof typeof space;
