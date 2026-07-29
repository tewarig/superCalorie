import { cleanup, fireEvent, render } from "@testing-library/react-native";
import { FoodResultRow, LoggedFoodRow } from "./FoodRow";

describe("food rows", () => {
  afterEach(async () => {
    await cleanup();
  });

  it("adds a half or full search result", async () => {
    const onHalf = jest.fn();
    const onAdd = jest.fn();
    const screen = await render(<FoodResultRow meta="1 bowl · 232 kcal" name="Masoor dal" source="Local" onAdd={onAdd} onHalf={onHalf} />);
    fireEvent.press(screen.getByRole("button", { name: "½" }));
    fireEvent.press(screen.getByRole("button", { name: "Add" }));
    expect(onHalf).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("renders logged entries with and without a photo", async () => {
    const onRemove = jest.fn();
    const withoutPhoto = await render(<LoggedFoodRow calories={232} meta="1 bowl" name="Masoor dal" photoUri={null} onRemove={onRemove} />);
    fireEvent.press(withoutPhoto.getByText("×").parent!);
    expect(onRemove).toHaveBeenCalledTimes(1);
    await withoutPhoto.unmount();

    const withPhoto = await render(<LoggedFoodRow calories={105} meta="1 medium" name="Banana" photoUri="file:///banana.jpg" onRemove={() => {}} />);
    expect(withPhoto.getByLabelText("Banana photo")).toBeTruthy();
  });
});
