import { color, nutrition, palette } from "@supercalorie/ui/tokens";

/**
 * The tokens as plain values, for the handful of places React Native needs a
 * colour rather than a class — navigation options, status bars, spinners,
 * placeholder text, and the SVG strokes in the charts. Everything else uses
 * NativeWind classes.
 *
 * `colors` is the raw palette, for the charts and rings where the colour
 * encodes which macro a number is. `role` is the semantic layer, for chrome —
 * prefer it, the same way markup should prefer `bg-primary` over `bg-moss`.
 */
export const colors = palette;

export const role = color;

/**
 * Which colour means which macro. Re-exported so the rings on Summary and the
 * split editor on Goals cannot drift apart — they each kept their own copy of
 * this map before, which is two places to forget.
 */
export const macroColors = nutrition;
