import { flatColors } from "@supercalorie/ui/theme";

/**
 * The palette as plain values, for the handful of places React Native needs a
 * colour rather than a class — navigation options, status bars, and the SVG
 * strokes in the charts. Everything else uses NativeWind classes.
 */
export const colors = flatColors() as Record<string, string> & {
  canvas: string;
  paper: string;
  ink: string;
  muted: string;
  line: string;
  moss: string;
  citrus: string;
  berry: string;
  grain: string;
};
