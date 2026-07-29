import { render } from "@testing-library/react-native";
import { Heatmap } from "../Heatmap.native";

// Separate file: a second render in one file races the library's cleanup and
// comes back empty. See FoodResultRowFirst.test.tsx for the same split.
it("renders nothing at all before any day has been logged", async () => {
  const screen = await render(<Heatmap days={[]} />);
  expect(screen.toJSON()).toBeNull();
});
