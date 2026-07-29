import type { Meta, StoryObj } from "@storybook/react-native";
import { CalorieDial } from "./CalorieDial.native";

const meta = { title: "Nutrition/CalorieDial", component: CalorieDial, args: { eaten: 1480, goal: 2100 } } satisfies Meta<typeof CalorieDial>;
export default meta;
type Story = StoryObj<typeof meta>;

export const OnTrack: Story = {};
export const OverGoal: Story = { args: { eaten: 2320, goal: 2100 } };
