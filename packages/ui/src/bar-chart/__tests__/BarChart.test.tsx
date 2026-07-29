import { render } from "@testing-library/react-native";
import { BarChart } from "../BarChart.native";

it("labels each column with its value, and draws the goal line", async () => {
  const screen = await render(
    <BarChart
      data={[
        { key: "1", label: "M", value: 1800 },
        { key: "2", label: "T", value: 2400 },
        { key: "3", label: "W", value: 0 },
      ]}
      goal={2000}
    />,
  );

  expect(screen.getByLabelText("M: 1800 kcal")).toBeTruthy();
  // Over the goal, so this column is drawn in the warning tone.
  expect(screen.getByLabelText("T: 2400 kcal")).toBeTruthy();
  // A day off still renders a column, at low opacity rather than absent.
  expect(screen.getByLabelText("W: 0 kcal")).toBeTruthy();
});
