import { Text } from "react-native";
import { render } from "@testing-library/react-native";
import { Surface } from "../Surface.native";

describe("Surface", () => {
  it("renders its content", async () => {
    expect((await render(<Surface><Text>Device-first data</Text></Surface>)).getByText("Device-first data")).toBeTruthy();
  });
});
