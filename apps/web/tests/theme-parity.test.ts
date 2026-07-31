import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  borderRadius,
  flatColors,
  fontSize,
  letterSpacing,
  semanticColors,
  spacing,
} from "@supercalorie/ui/theme";

/**
 * The mobile app reads packages/ui/theme.cjs through a Tailwind preset. The
 * web app cannot: Tailwind v4 is CSS-first and its `@theme` block takes CSS,
 * not JavaScript. So globals.css restates the tokens, and this test is what
 * stops the two copies drifting — which is exactly how the project ended up
 * with three different greens before the palette was shared.
 */
const css = readFileSync(fileURLToPath(new URL("../src/app/globals.css", import.meta.url)), "utf8");

/** The literal hexes declared on `:root`, which is the palette's web copy. */
function declaredColors(): Record<string, string> {
  const root = css.slice(css.indexOf(":root {"), css.indexOf("@theme inline"));
  const declared: Record<string, string> = {};
  for (const [, name, hex] of root.matchAll(/--([a-z-]+):\s*(#[0-9A-Fa-f]{6});/g)) {
    declared[name] = hex.toUpperCase();
  }
  return declared;
}

/** Every `--<prefix>-<name>: <n>px` in the theme block, as `name -> n`. */
function declaredScale(prefix: string): Record<string, number> {
  const declared: Record<string, number> = {};
  const pattern = new RegExp(`--${prefix}-([a-z0-9-]+):\\s*(\\d+)px;`, "g");
  for (const [, name, value] of css.matchAll(pattern)) {
    declared[name] = Number(value);
  }
  return declared;
}

describe("web theme mirrors the shared palette", () => {
  it("declares every shared colour with the same value", () => {
    const declared = declaredColors();
    const shared = Object.fromEntries(
      Object.entries(flatColors()).map(([name, hex]) => [name, hex.toUpperCase()]),
    );

    expect(declared).toEqual(shared);
  });

  it("exposes each colour to Tailwind as a --color-* utility", () => {
    for (const name of Object.keys(declaredColors())) {
      expect(css).toContain(`--color-${name}: var(--${name});`);
    }
  });

  it("parses something, so an empty match cannot pass the comparison", () => {
    expect(Object.keys(declaredColors()).length).toBeGreaterThan(10);
  });

  it("scans the design system for classes", () => {
    // Shared components reach this app through a node_modules symlink, which
    // Tailwind's source detection skips. Dropping this line does not break
    // the build — the components simply render unstyled, which is far easier
    // to ship than to notice.
    expect(css).toContain('@source "../../../../packages/ui/src";');
  });
});

describe("web theme mirrors the semantic colour layer", () => {
  it("points every role at the same palette colour", () => {
    for (const [role, name] of Object.entries(semanticColors)) {
      expect(css).toContain(`--color-${role}: var(--${name});`);
    }
  });

  it("resolves roles through var() rather than repeating the hex", () => {
    // A literal hex here would be a second copy of the palette, which is the
    // failure this whole file exists to prevent.
    const theme = css.slice(css.indexOf("@theme inline"));
    for (const role of Object.keys(semanticColors)) {
      expect(theme).not.toMatch(new RegExp(`--color-${role}:\\s*#`));
    }
  });
});

describe("web theme mirrors the shared scales", () => {
  it("declares the spacing scale", () => {
    expect(declaredScale("spacing")).toEqual(spacing);
  });

  it("declares the letter-spacing scale", () => {
    expect(declaredScale("tracking")).toEqual(letterSpacing);
  });

  it("declares the named radii", () => {
    expect(declaredScale("radius")).toEqual(borderRadius);
  });

  it("declares the label type tier", () => {
    // Only the sizes the design system adds. `fontSize.xs` through `4xl`
    // restate Tailwind's own values so that inline styles and classes share
    // one vocabulary; restating them in CSS too would be noise that changes
    // nothing.
    const { micro, caption, label, display } = fontSize;
    expect(declaredScale("text")).toEqual({ micro, caption, label, display });
  });
});
