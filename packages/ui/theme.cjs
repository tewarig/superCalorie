/**
 * The design system's palette, in one place.
 *
 * CommonJS on purpose: Tailwind configs are `require`d, so a `.ts` file here
 * would need a build step before either app could read it. `src/tokens.ts`
 * re-exports this for TypeScript consumers, and the web app's `@theme` block
 * mirrors it — with a test asserting the two agree, because three separate
 * palettes is exactly how this drifted in the first place.
 */

const colors = {
  canvas: "#EFF4E9",
  paper: "#FFFDF6",
  ink: "#16251F",
  muted: "#63746B",
  line: "#D4DFD2",
  moss: { DEFAULT: "#285B43", deep: "#173B2C", pale: "#DDEBDD" },
  citrus: { DEFAULT: "#E97833", pale: "#FBE3CE" },
  berry: { DEFAULT: "#A6435D", pale: "#F4DEE4" },
  grain: { DEFAULT: "#BE8128", pale: "#F7EACB" },
  // Reads on the dial's dark ink card, where the normal muted/line tones
  // disappear. Only the dial should need these.
  dial: { track: "#365746", fill: "#E9C157", muted: "#B4C7B9", soft: "#DDEBDD" },
};

const borderRadius = { card: "28px", control: "18px" };

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

module.exports = { colors, borderRadius, fontFamily, flatColors };
