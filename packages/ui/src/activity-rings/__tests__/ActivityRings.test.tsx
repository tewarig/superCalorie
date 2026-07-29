import { render } from "@testing-library/react-native";
import { ActivityRings } from "../ActivityRings.native";

it("labels the whole dial for screen readers", async () => {
  const screen = await render(
    <ActivityRings
      rings={[{ key: "calories", label: "Calories", value: 1000, target: 2000, color: "#E97833" }]}
    />,
  );

  expect(screen.getByLabelText("Calories 1000 of 2000")).toBeTruthy();
});
