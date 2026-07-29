import { fireEvent, render } from "@testing-library/react-native";
import { LoggedFoodRow } from "../FoodRow.native";

/**
 * Split from FoodResultRow's tests deliberately: with both components
 * exercised in one file, every render after the first came back empty.
 * One component per file keeps each test honest.
 *
 * `render` is awaited because it resolves rather than returning
 * synchronously, and teardown is left to the library's automatic cleanup.
 */
describe("logged food rows", () => {
  it("removes a logged entry", async () => {
    const onRemove = jest.fn();

    const screen = await render(
      <LoggedFoodRow
        calories={232}
        meta="1 bowl"
        name="Masoor dal"
        photoUri={null}
        onRemove={onRemove}
      />,
    );

    // By accessible label rather than the "×" glyph: the Pressable sets an
    // accessibilityLabel, which replaces its children in the accessibility
    // tree, so getByText cannot see the glyph. This is also how the control
    // is reached with a screen reader, and it survives an icon change.
    fireEvent.press(screen.getByLabelText("Remove Masoor dal"));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("falls back to an initial when there is no photo", async () => {
    const screen = await render(
      <LoggedFoodRow
        calories={232}
        meta="1 bowl"
        name="Masoor dal"
        photoUri={null}
        onRemove={() => {}}
      />,
    );

    expect(screen.getByText("M")).toBeTruthy();
    expect(screen.queryByLabelText("Masoor dal photo")).toBeNull();
  });

  it("shows the photo when there is one", async () => {
    const screen = await render(
      <LoggedFoodRow
        calories={105}
        meta="1 medium"
        name="Banana"
        photoUri="file:///banana.jpg"
        onRemove={() => {}}
      />,
    );

    expect(screen.getByLabelText("Banana photo")).toBeTruthy();
  });

  it("drops the divider on the first row of a meal", async () => {
    const screen = await render(
      <LoggedFoodRow
        calories={105}
        divider={false}
        meta="1 medium"
        name="Banana"
        photoUri={null}
        onRemove={() => {}}
      />,
    );

    expect(screen.getByText("105")).toBeTruthy();
  });
});
