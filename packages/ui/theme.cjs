/**
 * The design tokens, in one place.
 *
 * This file is the single source of truth for every colour, spacing step,
 * radius and type size in superCalorie. Both apps read it: mobile through the
 * Tailwind preset next door, the web through the `@theme` block in
 * globals.css, which mirrors these values because Tailwind v4 is CSS-first and
 * cannot `require` JavaScript. `tests/theme-parity.test.ts` asserts the two
 * copies agree — three different greens is how this drifted the first time.
 *
 * CommonJS on purpose: Tailwind configs are `require`d, so a `.ts` file here
 * would need a build step before either app could read it. `src/tokens.ts`
 * re-exports all of it typed, for the components that need plain values
 * instead of classes (SVG strokes, navigation options, inline styles).
 *
 * ── How to use these ────────────────────────────────────────────────────────
 *
 * Colours come in two layers, and which one to reach for depends on why the
 * colour is there.
 *
 * Use a **role** for chrome — `bg-primary` on a button, `text-danger` on an
 * error. These are the brand and state colours, the ones a rebrand changes,
 * and a role name is what stops "the green one" from meaning three things.
 *
 * Use a **palette name** when the colour is carrying data rather than
 * decorating: `bg-berry` for protein, `bg-citrus` for a bar that went over
 * goal. Renaming the brand's primary should not recolour a macro, so these
 * deliberately do not go through a role.
 *
 * The neutrals — `canvas`, `paper`, `line`, `ink`, `muted` — have no roles and
 * need none. They are already named for their job rather than their hue, so
 * `bg-canvas`, `border-line` and `text-muted` are the right thing to write; an
 * alias would only add a second spelling of the same colour. `src/tokens.ts`
 * does expose them as `color.background`/`surface`/`border`, because an inline
 * style has no class to read and reads better with the role name.
 *
 * Spacing is a scale, and layout should only use steps from it — `p-md`, not
 * `p-4`, and never `p-[13px]`. The numeric Tailwind scale still exists for
 * one-off geometry (a 56px button, a 224px dial), which is not spacing and
 * does not belong in the scale. Three names are aliases with intent:
 * `gutter` for a screen's edge padding, `fab`/`fab-clear` for the floating log
 * button and the room a scroll has to leave beneath it.
 *
 * Type sizes below 12px are for labels, so they are named for the job:
 * `text-label` is the uppercase eyebrow above a section, paired with
 * `tracking-label`. `caption` and `micro` are chart and heatmap axes. Anything
 * larger uses Tailwind's own scale.
 */

/**
 * The raw palette. Names describe the colour, not its job — see the semantic
 * layer below for that.
 */
const colors = {
  canvas: "#EFF4E9",
  paper: "#FFFDF6",
  ink: "#16251F",
  muted: "#63746B",
  line: "#D4DFD2",
  moss: { DEFAULT: "#285B43", deep: "#173B2C", pale: "#DDEBDD" },
  citrus: { DEFAULT: "#E97833", deep: "#C9520F", pale: "#FBE3CE" },
  berry: { DEFAULT: "#A6435D", pale: "#F4DEE4" },
  grain: { DEFAULT: "#BE8128", pale: "#F7EACB" },
  // Reads on the dial's dark ink card, where the normal muted/line tones
  // disappear. Only the dial should need these.
  dial: { track: "#365746", fill: "#E9C157", muted: "#B4C7B9", soft: "#DDEBDD" },
};

/**
 * What each colour is *for*, as `semantic name -> flat palette name`.
 *
 * Indirection rather than repeated hexes, so a palette change cannot leave a
 * role pointing at the old value.
 *
 * Brand and state only — the neutrals are deliberately absent, for the reason
 * given at the top of this file.
 */
const semanticColors = {
  primary: "moss",
  "primary-strong": "moss-deep",
  "primary-soft": "moss-pale",

  secondary: "citrus",
  "secondary-strong": "citrus-deep",
  "secondary-soft": "citrus-pale",

  danger: "berry",
  "danger-soft": "berry-pale",

  warning: "grain",
  "warning-soft": "grain-pale",
};

/**
 * The spacing scale, in pixels. Every margin, padding and gap picks a step
 * from here.
 *
 * `gutter`, `fab` and `fab-clear` are layout aliases, not extra steps: the
 * screen edge inset, the floating log button's diameter, and the bottom
 * padding a scroll needs so its last card clears that button.
 */
const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,

  gutter: 16,
  fab: 56,
  "fab-clear": 96,
};

/**
 * Type sizes, in pixels.
 *
 * `xs` through `4xl` deliberately restate Tailwind's own values, so extending
 * the theme with them changes nothing about how classes render and there is
 * still only one scale to read from — `fontSize.base` in an inline style is
 * the same 16px as `text-base` in a class. The additions are the label tier
 * below 12px and `display` at the top.
 */
const fontSize = {
  micro: 9,
  caption: 10,
  label: 11,
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
  display: 44,
};

/** Tracking for the uppercase label tiers, which need air to stay readable. */
const letterSpacing = {
  label: 2,
  eyebrow: 3,
};

/**
 * Radii the design system names. Tailwind's numeric `rounded-*` scale is left
 * alone rather than restated, because its values are nothing like these and
 * overriding `rounded-lg` would quietly reshape everything already using it.
 */
const borderRadius = { card: 28, control: 18, pill: 999 };

const fontFamily = {
  display: ["Fraunces_600SemiBold"],
  body: ["DMSans_400Regular"],
  medium: ["DMSans_500Medium"],
  bold: ["DMSans_700Bold"],
};

/** Flattened `name -> hex`, which is the shape CSS variables need. */
function flatColors() {
  const flat = {};
  for (const [name, value] of Object.entries(colors)) {
    if (typeof value === "string") {
      flat[name] = value;
      continue;
    }
    for (const [shade, hex] of Object.entries(value)) {
      flat[shade === "DEFAULT" ? name : `${name}-${shade}`] = hex;
    }
  }
  return flat;
}

/**
 * The semantic layer resolved to hexes, `primary -> "#285B43"`.
 *
 * Throws on a role pointing at a colour that no longer exists, so a palette
 * rename fails here rather than rendering something transparent.
 */
function resolvedSemanticColors() {
  const flat = flatColors();
  const resolved = {};
  for (const [role, name] of Object.entries(semanticColors)) {
    if (!flat[name]) {
      throw new Error(`Semantic colour "${role}" points at unknown palette colour "${name}"`);
    }
    resolved[role] = flat[name];
  }
  return resolved;
}

/** Every colour Tailwind should know about: the palette plus the roles. */
function tailwindColors() {
  return { ...colors, ...resolvedSemanticColors() };
}

/** `{ md: 16 }` becomes `{ md: "16px" }`, which is what Tailwind wants. */
function px(scale) {
  return Object.fromEntries(Object.entries(scale).map(([name, value]) => [name, `${value}px`]));
}

module.exports = {
  colors,
  semanticColors,
  spacing,
  fontSize,
  letterSpacing,
  borderRadius,
  fontFamily,
  flatColors,
  resolvedSemanticColors,
  tailwindColors,
  px,
};
