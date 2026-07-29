/* This file is generated from .rnstorybook/main.ts by the Storybook Metro plugin. */
import { start, updateView } from "@storybook/react-native";
import "@storybook/addon-ondevice-actions/register";

const normalizedStories = [{
  titlePrefix: "",
  directory: "./src/components",
  files: "**/*.stories.@(ts|tsx)",
  importPathMatcher: /\.stories\.(ts|tsx)$/, // @ts-ignore Metro provides require.context.
  req: require.context("../src/components", true, /\.stories\.(ts|tsx)$/),
}];

declare global {
  var view: ReturnType<typeof start>;
  var STORIES: typeof normalizedStories;
}

const annotations = [
  require("./preview"),
  require("@storybook/react-native/dist/preview"),
  require("@storybook/addon-ondevice-actions/preview"),
];

global.STORIES = normalizedStories;

if (!global.view) global.view = start({ annotations, storyEntries: normalizedStories });
else updateView(global.view, annotations, normalizedStories);

export const view = global.view;
