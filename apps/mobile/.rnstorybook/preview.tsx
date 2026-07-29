import type { Preview } from "@storybook/react-native";
import { View } from "react-native";

const preview: Preview = {
  decorators: [(Story) => <View className="flex-1 bg-canvas p-5"><Story /></View>],
};

export default preview;
