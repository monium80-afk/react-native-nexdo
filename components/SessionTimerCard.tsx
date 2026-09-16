import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { AnimatedPressable } from "@/components/AnimatedPressable";
import { colors } from "@/constants/theme";
import type { SessionCountdown } from "@/hooks/useSessionCountdown";

export function SessionTimerCard({
  countdown,
  onToggleRunning,
  onReset,
}: {
  countdown: SessionCountdown;
  onToggleRunning: () => void;
  onReset: () => void;
}) {
  const { clock, caption, progress, isRunning, isOvertime } = countdown;

  return (
    <View className="card card--charcoal gap-4 p-5">
      <View className="flex-row items-center gap-2">
        <View className="h-1.5 w-1.5 rounded-full bg-orange-500" />
        <Text className="eyebrow text-ink-charcoal-muted">SESSION TIMER</Text>
      </View>

      <View className="flex-row items-baseline gap-3">
        <Text
          className="font-grotesk-bold text-[38px] leading-[1.05] tracking-tight"
          style={{ color: isOvertime ? colors.orange[500] : colors.ink.charcoal }}
        >
          {clock}
        </Text>
        <Text className="flex-1 font-grotesk-medium text-sm text-ink-charcoal-muted">{caption}</Text>
      </View>

      {/* Flex ratios rather than a percentage width: RN takes fractional
          flex directly, so there's no `${n}%` string to type-wrangle. */}
      <View className="h-1 flex-row overflow-hidden rounded-full bg-white/10">
        <View className="rounded-full bg-orange-500" style={{ flex: progress }} />
        <View style={{ flex: 1 - progress }} />
      </View>

      <View className="flex-row items-center gap-2">
        <AnimatedPressable
          onPress={onToggleRunning}
          accessibilityRole="button"
          accessibilityLabel={isRunning ? "Pause session timer" : "Resume session timer"}
          className="flex-row items-center gap-2 rounded-full bg-white/10 px-5 py-3"
        >
          <Feather name={isRunning ? "pause" : "play"} size={15} color={colors.ink.charcoal} />
          <Text className="font-grotesk-semibold text-sm text-ink-charcoal">
            {isRunning ? "Pause" : "Resume"}
          </Text>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={onReset}
          accessibilityRole="button"
          accessibilityLabel="Restart session timer"
          className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
        >
          <Feather name="rotate-ccw" size={15} color={colors.ink.charcoal} />
        </AnimatedPressable>
      </View>
    </View>
  );
}
