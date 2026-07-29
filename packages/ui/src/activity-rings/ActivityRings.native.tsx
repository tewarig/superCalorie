import { View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
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
    <View accessibilityLabel={ringsLabel(arcs)} accessibilityRole="image">
      <Svg height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
        <G rotation={-90} origin={`${centre}, ${centre}`}>
          {arcs.map((arc) => (
            <G key={arc.key}>
              {/* The unfilled track, at low opacity so the ring reads as a
                  dial rather than as a floating stroke. */}
              <Circle
                cx={centre}
                cy={centre}
                fill="none"
                opacity={0.22}
                r={arc.radius}
                stroke={arc.color}
                strokeWidth={strokeWidth}
              />
              <Circle
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
            </G>
          ))}
        </G>
      </Svg>
    </View>
  );
}
