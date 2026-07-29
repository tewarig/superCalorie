import type { Meta, StoryObj } from "@storybook/react-native";
import { LoggedFoodRow, FoodResultRow } from "./FoodRow.native";

const meta = { title: "Nutrition/Food rows", component: FoodResultRow, args: { name: "Masoor dal", source: "Local", meta: "1 bowl · 232 kcal", onHalf: () => {}, onAdd: () => {} } } satisfies Meta<typeof FoodResultRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SearchResult: Story = {};
export const LoggedEntry: Story = { render: () => <LoggedFoodRow calories={232} meta="1 bowl" name="Masoor dal" photoUri={null} onRemove={() => {}} /> };
