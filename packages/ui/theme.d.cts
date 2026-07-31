export type ColorScale = { DEFAULT: string; [shade: string]: string };

/**
 * Hand-written to match theme.cjs, which is CommonJS so that Tailwind can
 * `require` it without a build step. The keys are spelled out rather than
 * widened to `Record<string, number>` so that `space.md` is checked and
 * `space.medium` is a compile error.
 */
export declare const colors: Record<string, string | ColorScale>;
export declare const semanticColors: Record<string, string>;

export declare const spacing: {
  xxs: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
  gutter: number;
  fab: number;
  "fab-clear": number;
};

export declare const fontSize: {
  micro: number;
  caption: number;
  label: number;
  xs: number;
  sm: number;
  base: number;
  lg: number;
  xl: number;
  "2xl": number;
  "3xl": number;
  "4xl": number;
  display: number;
};

export declare const letterSpacing: { label: number; eyebrow: number };

export declare const borderRadius: { card: number; control: number; pill: number };

export declare const fontFamily: Record<string, string[]>;

/** Flattened `name -> hex`, e.g. `moss`, `moss-pale`. */
export declare function flatColors(): Record<string, string>;

/** The semantic layer resolved to hexes, e.g. `primary -> "#285B43"`. */
export declare function resolvedSemanticColors(): Record<string, string>;

/** The palette plus the semantic roles, as one map for Tailwind. */
export declare function tailwindColors(): Record<string, string | ColorScale>;

/** `{ md: 16 }` becomes `{ md: "16px" }`. */
export declare function px(scale: Record<string, number>): Record<string, string>;
