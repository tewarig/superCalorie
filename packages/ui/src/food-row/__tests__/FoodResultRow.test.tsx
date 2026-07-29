import { fireEvent, render } from "@testing-library/react-native";
import { FoodResultRow } from "../FoodRow.native";

/**
 * `render` is awaited throughout: it resolves rather than returning
 * synchronously here, and an un-awaited call yields a Promise whose query
 * methods are undefined.
 *
 * Teardown is left to the library's automatic cleanup — calling `cleanup()`
 * by hand as well unmounts twice, and the next render comes back empty.
 */
describe("food rows", () => {
  it("adds a half or full search result", async () => {
    const onHalf = jest.fn();
    const onAdd = jest.fn();

    const screen = await render(
      <FoodResultRow
        meta="1 bowl · 232 kcal"
        name="Masoor dal"
        source="Local"
        onAdd={onAdd}
        onHalf={onHalf}
      />,
    );

    fireEvent.press(screen.getByRole("button", { name: "½" }));
    fireEvent.press(screen.getByRole("button", { name: "Add" }));

    expect(onHalf).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
