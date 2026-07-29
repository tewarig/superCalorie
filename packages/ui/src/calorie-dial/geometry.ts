export type DialGeometry = {
  /** Progress clamped to 0..1, for drawing. */
  complete: number;
  /** True once the goal is exceeded — from the raw ratio, not the clamped one. */
  over: boolean;
  /** Calories still available, floored at zero. */
  remaining: number;
  /** Calories past the goal, floored at zero. */
  excess: number;
};

/**
 * Shared arithmetic for the dial so both platforms round identically.
 *
 * A goal of zero would divide by zero, and goals are user-editable, so it
 * degrades to no progress rather than NaN.
 */
export function dialGeometry(eaten: number, goal: number): DialGeometry {
  const ratio = goal > 0 ? eaten / goal : 0;
  return {
    complete: Math.min(Math.max(ratio, 0), 1),
    over: ratio > 1,
    remaining: Math.max(goal - eaten, 0),
    excess: Math.max(eaten - goal, 0),
  };
}

export type CalorieDialProps = { eaten: number; goal: number };

/** The copy is shared so the two platforms can never say different things. */
export function dialCaption({ over, remaining, excess }: DialGeometry): string {
  return over ? `${excess} kcal over your goal` : `${remaining} kcal left to log`;
}
