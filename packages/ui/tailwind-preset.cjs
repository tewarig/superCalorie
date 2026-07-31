const {
  borderRadius,
  fontFamily,
  fontSize,
  letterSpacing,
  px,
  spacing,
  tailwindColors,
} = require("./theme.cjs");

/**
 * Tailwind preset shared by anything rendering the design system.
 *
 * The mobile app applies this on top of `nativewind/preset`. It carries the
 * theme only — no `content` globs, since those are relative to whichever app
 * is doing the building.
 *
 * Everything here `extend`s rather than replaces, so Tailwind's numeric
 * spacing scale and type sizes stay available for the one-off geometry that is
 * not spacing. See theme.cjs for when to use which.
 */
module.exports = {
  theme: {
    extend: {
      colors: tailwindColors(),
      spacing: px(spacing),
      borderRadius: px(borderRadius),
      fontSize: px(fontSize),
      letterSpacing: px(letterSpacing),
      fontFamily,
    },
  },
};
