/**
 * superCalorie design tokens, typed.
 *
 * Every value here comes from ../theme.cjs, which is the single source of
 * truth and the file to read for what these mean and when to use which. This
 * module exists because Tailwind classes cannot reach everywhere: SVG strokes,
 * React Navigation options and the inline-style components all need a plain
 * number or hex.
 *
 * Prefer a class when a class will do. Reach for these when it will not.
 */
import {
  borderRadius,
  fontSize as fontSizeScale,
  letterSpacing as letterSpacingScale,
  flatColors,
  resolvedSemanticColors,
  spacing,
} from "../theme.cjs";

const hex = flatColors();
const role = resolvedSemanticColors();

/** The raw palette — what each colour *is*. */
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
  citrusDeep: hex["citrus-deep"],
  citrusPale: hex["citrus-pale"],
  berry: hex.berry,
  berryPale: hex["berry-pale"],
  grain: hex.grain,
  grainPale: hex["grain-pale"],

  white: "#FFFFFF",
} as const;

/**
 * What each colour is *for*. Prefer these over `palette` — see theme.cjs.
 *
 * The neutrals have no role in the Tailwind layer, because `canvas`, `paper`,
 * `line`, `ink` and `muted` already read as roles there. They are spelled out
 * here anyway, because an inline style has no class to read and should not
 * have to know that `ink` happens to be the text colour.
 */
export const color = {
  background: palette.canvas,
  surface: palette.paper,
  surfaceMuted: role["primary-soft"],
  border: palette.line,

  text: palette.ink,
  textMuted: palette.muted,
  // The shared palette has one muted tone, so the old faint tier collapses
  // into it. Placeholders read a little darker than before as a result.
  textFaint: palette.muted,
  textOnDark: palette.paper,

  primary: role.primary,
  primaryPressed: role["primary-strong"],
  primarySubtle: role["primary-soft"],

  secondary: role.secondary,
  secondaryPressed: role["secondary-strong"],
  secondarySubtle: role["secondary-soft"],

  danger: role.danger,
  warning: role.warning,
} as const;

export const space = spacing;
export const radius = borderRadius;
export const fontSize = fontSizeScale;
export const letterSpacing = letterSpacingScale;

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
