import { fireEvent, render } from "@testing-library/react-native";
import { AppButton } from "./AppButton";

describe("AppButton", () => {
  it.each(["primary", "secondary", "quiet", "danger"] as const)("calls its handler for the %s tone", async (tone) => {
    const onPress = jest.fn();
    const screen = await render(<AppButton tone={tone} onPress={onPress}>Log food</AppButton>);
    fireEvent.press(screen.getByRole("button", { name: "Log food" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("exposes disabled and full-width states", async () => {
    const onPress = jest.fn();
    const screen = await render(<AppButton disabled fullWidth size="sm" onPress={onPress}>Disabled</AppButton>);
    fireEvent.press(screen.getByRole("button", { name: "Disabled" }));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByText("Disabled")).toBeTruthy();
  });
});
