/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "../../packages/ui/src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        canvas: "#EFF4E9",
        paper: "#FFFDF6",
        ink: "#16251F",
        muted: "#63746B",
        line: "#D4DFD2",
        moss: { DEFAULT: "#285B43", deep: "#173B2C", pale: "#DDEBDD" },
        citrus: { DEFAULT: "#E97833", pale: "#FBE3CE" },
        berry: { DEFAULT: "#A6435D", pale: "#F4DEE4" },
        grain: { DEFAULT: "#BE8128", pale: "#F7EACB" },
      },
      fontFamily: {
        display: ["Fraunces_600SemiBold"],
        body: ["DMSans_400Regular"],
        medium: ["DMSans_500Medium"],
        bold: ["DMSans_700Bold"],
      },
      borderRadius: { card: "28px", control: "18px" },
    },
  },
  plugins: [],
};
