import type { HeatmapDay } from "@supercalorie/core";
import { render } from "@testing-library/react-native";
import { Heatmap } from "../Heatmap.native";

// Two columns inside one month: the first is captioned, the second is blank.
const days: HeatmapDay[] = Array.from({ length: 10 }, (_, index) => ({
  date: `2026-01-${String(index + 5).padStart(2, "0")}`,
  level: 1,
  calories: 1500,
})) as HeatmapDay[];

it("captions only the column that opens a month", async () => {
  const screen = await render(<Heatmap days={days} />);

  expect(screen.getByText("Jan")).toBeTruthy();
  expect(screen.getByLabelText("2026-01-05: 1500 kcal")).toBeTruthy();
});
