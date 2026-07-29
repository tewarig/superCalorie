/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "../../packages/ui/src/**/*.{js,jsx,ts,tsx}"],
  // The theme lives in the design system so the web app can render the same
  // palette; this file only says where to look for classes.
  presets: [require("nativewind/preset"), require("@supercalorie/ui/tailwind-preset")],
  plugins: [],
};
