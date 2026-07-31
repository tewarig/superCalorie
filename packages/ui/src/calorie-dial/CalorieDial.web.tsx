import { dialCaption, dialGeometry, type CalorieDialProps } from "./geometry";

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The web dial draws a real arc rather than the native build's decorative
 * ring — SVG is available here and the progress is worth showing precisely.
 * The numbers and the caption come from the same helpers either way.
 */
export function CalorieDial({ eaten, goal }: CalorieDialProps) {
  const geometry = dialGeometry(eaten, goal);
  const { complete, over } = geometry;

  return (
    <div className="flex flex-wrap items-center gap-xl overflow-hidden rounded-card bg-ink p-xl">
      <svg aria-hidden="true" className="shrink-0" height="132" viewBox="0 0 132 132" width="132">
        <circle cx="66" cy="66" fill="none" r={RADIUS} stroke="var(--color-dial-track)" strokeWidth="12" />
        <circle
          className="ring-anim"
          cx="66"
          cy="66"
          fill="none"
          r={RADIUS}
          stroke={over ? "var(--color-citrus)" : "var(--color-dial-fill)"}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - complete)}
          strokeLinecap="round"
          strokeWidth="12"
          transform="rotate(-90 66 66)"
        />
      </svg>
      <div className="min-w-0">
        <p className="font-bold text-xs uppercase tracking-eyebrow text-dial-muted">Today&apos;s fuel</p>
        <p className="mt-lg flex items-end gap-sm">
          <span className="font-display text-6xl text-paper">{eaten}</span>
          <span className="mb-sm text-base text-dial-muted">of {goal} kcal</span>
        </p>
        <p className={`mt-md font-bold text-sm ${over ? "text-citrus" : "text-dial-soft"}`}>{dialCaption(geometry)}</p>
      </div>
    </div>
  );
}
