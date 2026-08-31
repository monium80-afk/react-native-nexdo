import { useEffect } from "react";
import { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const DURATION = 280;
const RISE_DISTANCE = 14;

/**
 * Fade + rise entrance used on every top-level screen, replacing the
 * platform's default push transition (which we disable via
 * `animation: "none"` on the Stacks) so timing/easing stays exact and
 * consistent across iOS/Android/web.
 */
export function useScreenEnterAnimation() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: DURATION,
      easing: Easing.out(Easing.ease),
    });
  }, [progress]);

  return useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * RISE_DISTANCE }],
  }));
}
