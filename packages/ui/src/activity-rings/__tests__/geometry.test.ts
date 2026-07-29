import { ringLayout, ringsLabel } from "../geometry";

const RINGS = [
  { key: "calories", label: "Calories", value: 1000, target: 2000, color: "#E97833" },
  { key: "protein", label: "Protein", value: 150, target: 150, color: "#A6435D" },
  { key: "fat", label: "Fat", value: 90, target: 60, color: "#285B43" },
];

describe("ringLayout", () => {
  it("insets each ring so they never overlap", () => {
    const { arcs } = ringLayout(RINGS, { size: 220, strokeWidth: 22, gap: 6 });
    const gaps = arcs.slice(1).map((arc, index) => arcs[index].radius - arc.radius);

    // Every step is a full stroke plus the gap, so no two strokes touch.
    expect(gaps).toEqual([28, 28]);
  });

  it("leaves half the path unpainted at half progress", () => {
    const [calories] = ringLayout(RINGS).arcs;
    expect(calories.complete).toBe(0.5);
    expect(calories.offset).toBeCloseTo(calories.circumference / 2);
  });

  it("marks a ring met at exactly the target, not just past it", () => {
    const [, protein] = ringLayout(RINGS).arcs;
    expect(protein.met).toBe(true);
    expect(protein.offset).toBe(0);
  });

  it("clamps a ring past its target so the stroke cannot wrap round twice", () => {
    const [, , fat] = ringLayout(RINGS).arcs;
    expect(fat.complete).toBe(1);
    expect(fat.offset).toBe(0);
    // The raw percentage is still reported, so the UI can say "150%".
    expect(fat.percent).toBe(150);
  });

  it("draws nothing rather than NaN when a target is zero", () => {
    const [arc] = ringLayout([{ key: "k", label: "L", value: 10, target: 0, color: "#000" }]).arcs;
    expect(arc.complete).toBe(0);
    expect(arc.offset).toBe(arc.circumference);
    expect(Number.isNaN(arc.percent)).toBe(false);
  });

  it("treats a negative value as empty", () => {
    const [arc] = ringLayout([{ key: "k", label: "L", value: -5, target: 100, color: "#000" }]).arcs;
    expect(arc.complete).toBe(0);
  });

  it("uses the default size and stroke when none are given", () => {
    expect(ringLayout(RINGS).size).toBe(220);
    expect(ringLayout(RINGS).strokeWidth).toBe(22);
  });
});

describe("ringsLabel", () => {
  it("describes every ring in one sentence for screen readers", () => {
    expect(ringsLabel(ringLayout(RINGS).arcs)).toBe(
      "Calories 1000 of 2000, Protein 150 of 150, Fat 90 of 60",
    );
  });
});
