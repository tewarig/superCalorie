const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CalorieRing({
  eaten,
  goal,
  size = 150,
}: {
  eaten: number;
  goal: number;
  size?: number;
}) {
  const progress = goal > 0 ? Math.min(eaten / goal, 1) : 0;
  const over = eaten > goal;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="var(--parchment)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          stroke={over ? "var(--berry)" : "var(--tangerine)"}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-semibold tabular-nums text-ink">{eaten}</span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
          of {goal} kcal
        </span>
      </div>
    </div>
  );
}
