import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { flatColors } from "@supercalorie/ui/theme";

/**
 * The mobile app reads packages/ui/theme.cjs through a Tailwind preset. The
 * web app cannot: Tailwind v4 is CSS-first and its `@theme` block takes CSS,
 * not JavaScript. So globals.css restates the palette, and this test is what
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
