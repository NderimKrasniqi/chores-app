import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import { useTheme } from "@/design-system/theme";

const H = 16;
const LOCK = 12;

/**
 * An Extra's promise, drawn as a line from now to its deadline. The dashed
 * part is the abort window (you can still back out with a pass); the lock is
 * the point of no return, two hours before the deadline; the pink part after
 * it is "locked in: finish or lose the reward". A mission that would lock
 * the moment you launch it is pink all the way.
 */
export function CommitmentTrack({
  now,
  lockAt,
  deadlineAt,
  immediate = false,
}: {
  now: number;
  lockAt: number;
  deadlineAt: number;
  /** Launching it now locks it straight away (inside the window / no passes). */
  immediate?: boolean;
}) {
  const { tokens } = useTheme();
  const [width, setWidth] = useState(0);
  const span = Math.max(1, deadlineAt - now);
  const lockFraction =
    immediate || lockAt <= now ? 0 : Math.min(1, (lockAt - now) / span);
  const pad = LOCK / 2 + 1;
  const usable = Math.max(0, width - pad * 2 - 6);
  const lockX = pad + usable * lockFraction;
  const endX = pad + usable;
  const y = H / 2;

  return (
    <View
      style={{ height: H }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      pointerEvents="none"
      accessible={false}
    >
      {width > 0 ? (
        <Svg width={width} height={H}>
          {lockFraction > 0 ? (
            <Line
              x1={pad}
              y1={y}
              x2={lockX}
              y2={y}
              stroke={tokens.inkMuted}
              strokeWidth={2.5}
              strokeDasharray="3 4"
              strokeLinecap="round"
            />
          ) : null}
          <Line
            x1={lockX}
            y1={y}
            x2={endX}
            y2={y}
            stroke={tokens.pink}
            strokeWidth={3}
            strokeLinecap="round"
          />
          {/* now */}
          <Circle cx={pad} cy={y} r={3} fill={tokens.ink} />
          {/* the lock: point of no return */}
          <Rect
            x={lockX - LOCK / 2}
            y={y - LOCK / 2 + 2}
            width={LOCK}
            height={LOCK - 3}
            rx={2}
            fill={tokens.pink}
            stroke={tokens.night}
            strokeWidth={1.5}
          />
          <Path
            d={`M${lockX - 3} ${y - 1} V${y - 3.5} A3 3 0 0 1 ${lockX + 3} ${y - 3.5} V${y - 1}`}
            stroke={tokens.pink}
            strokeWidth={1.8}
            fill="none"
          />
          {/* deadline flag */}
          <Line
            x1={endX + 2}
            y1={y + 5}
            x2={endX + 2}
            y2={y - 7}
            stroke={tokens.ink}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <Path
            d={`M${endX + 2} ${y - 7} L${endX + 8} ${y - 4.5} L${endX + 2} ${y - 2} Z`}
            fill={tokens.ink}
          />
        </Svg>
      ) : null}
    </View>
  );
}
