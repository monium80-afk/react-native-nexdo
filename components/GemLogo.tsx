import Svg, { ClipPath, Defs, Rect } from "react-native-svg";

import { colors } from "@/constants/theme";

type GemLogoProps = {
  size?: number;
};

const SQUARE = 48;
const CORNER_RADIUS = 14;
const CENTER = 50;

export function GemLogo({ size = 40 }: GemLogoProps) {
  const half = SQUARE / 2;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id="gemClip">
          <Rect
            x={CENTER - half}
            y={CENTER - half}
            width={SQUARE}
            height={SQUARE}
            rx={CORNER_RADIUS}
            transform={`rotate(45 ${CENTER} ${CENTER})`}
          />
        </ClipPath>
      </Defs>
      <Rect
        x={0}
        y={0}
        width={CENTER}
        height={100}
        fill={colors.charcoal[900]}
        clipPath="url(#gemClip)"
      />
      <Rect
        x={CENTER}
        y={0}
        width={CENTER}
        height={100}
        fill={colors.orange[500]}
        clipPath="url(#gemClip)"
      />
    </Svg>
  );
}
