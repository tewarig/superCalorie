const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
// Named export, not a default one. Requiring the module gives you
// `{ withStorybook }`, and calling that object is the "withStorybook is not a
// function" crash Metro reports before the dev server can start.
const { withStorybook } = require("@storybook/react-native/metro/withStorybook");

const config = withNativeWind(getDefaultConfig(__dirname), {
  input: "./src/global.css",
  inlineNativeRem: 16,
});

module.exports = withStorybook(config, {
  configPath: "./.rnstorybook",
  enabled: process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === "true",
});
