import { view } from "./storybook.requires";

const memoryStore = new Map<string, string>();

const StorybookUIRoot = view.getStorybookUI({
  storage: {
    getItem: async (key) => memoryStore.get(key) ?? null,
    setItem: async (key, value) => { memoryStore.set(key, value); },
  },
});

export default StorybookUIRoot;
