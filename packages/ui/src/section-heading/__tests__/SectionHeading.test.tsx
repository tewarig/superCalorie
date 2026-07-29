import { render } from "@testing-library/react-native";
import { SectionHeading } from "../SectionHeading.native";

describe("SectionHeading", () => {
  it("renders with optional supporting detail", async () => {
    const screen = await render(<SectionHeading detail="432 kcal" title="Lunch" />);
    expect(screen.getByText("Lunch")).toBeTruthy();
    expect(screen.getByText("432 kcal")).toBeTruthy();
  });

  it("renders without supporting detail", async () => {
    expect((await render(<SectionHeading title="Your data" />)).getByText("Your data")).toBeTruthy();
  });
});
