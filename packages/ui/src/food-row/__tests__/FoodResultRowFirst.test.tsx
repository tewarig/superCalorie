import { render } from "@testing-library/react-native";
import { FoodResultRow } from "../FoodRow.native";

/**
 * One render per file, deliberately.
 *
 * A second render in the same file comes back as an empty tree — React logs
 * "overlapping act() calls" and the component never runs. Setting
 * IS_REACT_ACT_ENVIRONMENT fixed the worst of it, but two renders in one file
 * still race the library's automatic cleanup, so the suite keeps them apart
 * (see the FoodResultRow / LoggedFoodRow split for the same reason).
 */
it("renders the first row without a divider above it", async () => {
  const screen = await render(
    <FoodResultRow
      divider={false}
      meta="1 bowl · 232 kcal"
      name="Masoor dal"
      source="Local"
      onAdd={jest.fn()}
      onHalf={jest.fn()}
    />,
  );

  expect(screen.getByText("Masoor dal")).toBeTruthy();
});
