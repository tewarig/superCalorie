import { initial, rowClasses } from "../types";

/**
 * The divider is a prop rather than a `first:` variant because NativeWind has
 * no `first:` on native — the original markup carried `first:border-t-0`,
 * which silently did nothing on device and drew a hairline above the first
 * row of every list. These assertions are what keep that from coming back.
 */
describe("rowClasses", () => {
  it("draws a top border on rows that follow another", () => {
    expect(rowClasses(true)).toContain("border-t");
  });

  it("omits it on the first row, rather than relying on a `first:` variant", () => {
    expect(rowClasses(false)).not.toContain("border-t");
  });

  it("keeps the vertical rhythm either way, so rows do not shift", () => {
    expect(rowClasses(true)).toContain("py-4");
    expect(rowClasses(false)).toContain("py-4");
  });
});

describe("initial", () => {
  it("uppercases the first letter for the fallback avatar", () => {
    expect(initial("masoor dal")).toBe("M");
  });

  it("returns empty rather than throwing on an empty name", () => {
    expect(initial("")).toBe("");
  });
});
