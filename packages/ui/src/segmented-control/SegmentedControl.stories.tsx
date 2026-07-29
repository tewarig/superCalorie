import type { Meta, StoryObj } from "@storybook/react-native";
import { SegmentedControl } from "./SegmentedControl.native";

const meta = { title: "Primitives/SegmentedControl", component: SegmentedControl, args: { options: [{ label: "Breakfast", value: "breakfast" }, { label: "Lunch", value: "lunch" }, { label: "Dinner", value: "dinner" }], value: "lunch", onChange: () => {} } } satisfies Meta<typeof SegmentedControl>;
export default meta;
type Story = StoryObj<typeof meta>;

export const MealPicker: Story = {};
