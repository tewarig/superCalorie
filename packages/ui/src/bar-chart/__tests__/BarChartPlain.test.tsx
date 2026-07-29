import { render } from "@testing-library/react-native";
import { BarChart } from "../BarChart.native";

// No goal, and a unit and height of its own: the chart is reused for step-like
// series, not only for calories against a target.
it("renders without a goal line and in another unit", async () => {
  const screen = await render(
    <BarChart data={[{ key: "1", label: "M", value: 12 }]} height={60} unit="g" />,
  );

  expect(screen.getByLabelText("M: 12 g")).toBeTruthy();
});
