const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const withStorybook = require("@storybook/react-native/metro/withStorybook");

const config = withNativeWind(getDefaultConfig(__dirname), {
  input: "./src/global.css",
  inlineNativeRem: 16,
});

module.exports = withStorybook(config, {
  configPath: "./.rnstorybook",
  enabled: process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === "true",
});
