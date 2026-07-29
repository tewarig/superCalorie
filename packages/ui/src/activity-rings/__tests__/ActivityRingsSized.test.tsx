import { render } from "@testing-library/react-native";
import { ActivityRings } from "../ActivityRings.native";

// Separate file so this render does not race the one in ActivityRings.test.
// Passing size and stroke explicitly exercises the non-default path.
it("accepts an explicit size and stroke width", async () => {
  const screen = await render(
    <ActivityRings
      rings={[{ key: "protein", label: "Protein", value: 40, target: 150, color: "#A6435D" }]}
      size={90}
      strokeWidth={8}
    />,
  );

  expect(screen.getByLabelText("Protein 40 of 150")).toBeTruthy();
});
