import { render } from "@testing-library/react-native";
import { Heatmap } from "../Heatmap.native";

it("renders a cell per day, described by date and calories", async () => {
  const screen = await render(
    <Heatmap days={[{ date: "2026-01-05", level: 3, calories: 2100 }]} />,
  );

  expect(screen.getByLabelText("2026-01-05: 2100 kcal")).toBeTruthy();
});
