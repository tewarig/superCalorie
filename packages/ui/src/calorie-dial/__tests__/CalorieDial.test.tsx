import { render } from "@testing-library/react-native";
import { CalorieDial } from "../CalorieDial.native";

describe("CalorieDial", () => {
  it("shows remaining calories while on track", async () => {
    const screen = await render(<CalorieDial eaten={1480} goal={2100} />);
    expect(screen.getByText("620 kcal left to log")).toBeTruthy();
  });

  it("handles a zero goal and an over-goal day", async () => {
    const zeroGoal = await render(<CalorieDial eaten={0} goal={0} />);
    expect(zeroGoal.getByText("0 kcal left to log")).toBeTruthy();

    const overGoal = await render(<CalorieDial eaten={2320} goal={2100} />);
    expect(overGoal.getByText("220 kcal over your goal")).toBeTruthy();
  });
});
