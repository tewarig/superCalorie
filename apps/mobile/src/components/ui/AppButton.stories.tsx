import type { Meta, StoryObj } from "@storybook/react-native";
import { AppButton } from "./AppButton";

const meta = { title: "Primitives/AppButton", component: AppButton, args: { children: "Log food" } } satisfies Meta<typeof AppButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { tone: "secondary", children: "Choose photo" } };
export const Quiet: Story = { args: { tone: "quiet", children: "Import file" } };
