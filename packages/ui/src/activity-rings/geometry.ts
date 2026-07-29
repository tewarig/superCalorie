/**
 * Geometry for the concentric progress rings, shared by both platforms.
 *
 * Everything here is plain arithmetic on numbers so the native build
 * (react-native-svg) and the web build (DOM svg) draw exactly the same
 * picture from exactly the same code. There is no charting library in this
 * package on purpose: the ones for React Native all need Skia or
 * react-native-svg, neither of which runs in the web app, so a library would
 * mean writing every chart twice.
 */

export interface RingInput {
  /** Identifies the ring, and keys its colour. */
  key: string;
  label: string;
  value: number;
  target: number;
  /** Ring colour, as a CSS colour or a CSS variable reference. */
  color: string;
}

export interface RingArc extends RingInput {
  /** Distance from the centre to the middle of the stroke. */
  radius: number;
  /** Total length of the ring's path, for stroke-dasharray. */
  circumference: number;
  /** How much of that length to leave unpainted. */
  offset: number;
  /** Progress clamped to 0..1. */
  complete: number;
  /** True once the target is met or passed. */
  met: boolean;
  /** Progress as a percentage, rounded, for accessibility labels. */
  percent: number;
}

export interface RingLayout {
  /** Width and height of the square viewBox. */
  size: number;
  centre: number;
  strokeWidth: number;
  arcs: RingArc[];
}

/**
 * Lays out one ring per input, outermost first.
 *
 * Rings are inset by a full stroke width plus a gap so they never touch,
 * which is what makes three of them readable at a glance rather than a
 * single thick smear.
 */
export function ringLayout(
  rings: readonly RingInput[],
  { size = 220, strokeWidth = 22, gap = 6 }: { size?: number; strokeWidth?: number; gap?: number } = {},
): RingLayout {
  const centre = size / 2;
  const outerRadius = centre - strokeWidth / 2;

  const arcs = rings.map((ring, index) => {
    const radius = outerRadius - index * (strokeWidth + gap);
    const circumference = 2 * Math.PI * radius;
    const ratio = ring.target > 0 ? ring.value / ring.target : 0;
    const complete = Math.min(Math.max(ratio, 0), 1);

    return {
      ...ring,
      radius,
      circumference,
      offset: circumference * (1 - complete),
      complete,
      met: ratio >= 1,
      percent: Math.round(ratio * 100),
    };
  });

  return { size, centre, strokeWidth, arcs };
}

/** One sentence describing every ring, for screen readers. */
export function ringsLabel(arcs: readonly RingArc[]): string {
  return arcs.map((arc) => `${arc.label} ${arc.value} of ${arc.target}`).join(", ");
}
