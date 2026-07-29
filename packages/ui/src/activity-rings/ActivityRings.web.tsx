import { ringLayout, ringsLabel, type RingInput } from "./geometry";

export function ActivityRings({
  rings,
  size = 220,
  strokeWidth = 22,
}: {
  rings: readonly RingInput[];
  size?: number;
  strokeWidth?: number;
}) {
  const { centre, arcs } = ringLayout(rings, { size, strokeWidth });

  return (
    <svg aria-label={ringsLabel(arcs)} height={size} role="img" viewBox={`0 0 ${size} ${size}`} width={size}>
      <g transform={`rotate(-90 ${centre} ${centre})`}>
        {arcs.map((arc) => (
          <g key={arc.key}>
            {/* The unfilled track, at low opacity so the ring reads as a dial
                rather than as a floating stroke. */}
            <circle
              cx={centre}
              cy={centre}
              fill="none"
              opacity={0.22}
              r={arc.radius}
              stroke={arc.color}
              strokeWidth={strokeWidth}
            />
            <circle
              cx={centre}
              cy={centre}
              fill="none"
              r={arc.radius}
              stroke={arc.color}
              strokeDasharray={arc.circumference}
              strokeDashoffset={arc.offset}
              strokeLinecap="round"
              strokeWidth={strokeWidth}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
