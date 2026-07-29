const { borderRadius, colors, fontFamily } = require("./theme.cjs");

/**
 * Tailwind preset shared by anything rendering the design system.
 *
 * The mobile app applies this on top of `nativewind/preset`. It carries the
 * theme only — no `content` globs, since those are relative to whichever app
 * is doing the building.
 */
module.exports = {
  theme: {
    extend: { colors, borderRadius, fontFamily },
  },
};
