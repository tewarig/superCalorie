import { fireEvent, render } from "@testing-library/react-native";
import { SegmentedControl } from "./SegmentedControl";

describe("SegmentedControl", () => {
  it("marks the active segment and changes value", async () => {
    const onChange = jest.fn();
    const screen = await render(<SegmentedControl options={[{ label: "Breakfast", value: "breakfast" }, { label: "Lunch", value: "lunch" }]} value="lunch" onChange={onChange} />);
    expect(screen.getByText("Lunch")).toBeTruthy();
    fireEvent.press(screen.getByText("Breakfast"));
    expect(onChange).toHaveBeenCalledWith("breakfast");
  });
});
