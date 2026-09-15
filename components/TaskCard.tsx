import { Feather, Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { AnimatedPressable } from "@/components/AnimatedPressable";
import { GemLogo } from "@/components/GemLogo";
import { MetaPill } from "@/components/MetaPill";
import { CATEGORY_META } from "@/constants/categories";
import { colors } from "@/constants/theme";
import { formatDuration } from "@/lib/formatDuration";
import { getDueInfo, getScoreTier } from "@/lib/taskMeta";
import type { Task } from "@/types/task";

type TaskCardProps = {
  task: Task;
  onPress: () => void;
  onToggle: () => void;
};

export function TaskCard({ task, onPress, onToggle }: TaskCardProps) {
  const category = CATEGORY_META[task.category];
  const due = getDueInfo(task);
  const scoreTier = getScoreTier(task.priorityScore);
  const isCompleted = task.status === "completed";
  const isOverdue = due.tone === "overdue";

  const cardVariant = isOverdue ? "card--overdue" : isCompleted ? "card--cream-muted" : "card--cream";

  return (
    <AnimatedPressable onPress={onPress} scaleTo={0.98} className={`card ${cardVariant} gap-3 p-5`}>
      <View className="flex-row items-start gap-3">
        <AnimatedPressable
          onPress={onToggle}
          hitSlop={8}
          className={
            isCompleted
              ? "h-6 w-6 items-center justify-center rounded-lg bg-orange-500"
              : isOverdue
                ? "h-6 w-6 rounded-lg border-2 border-overdue-500"
                : "h-6 w-6 rounded-lg border-2 border-cream-300"
          }
        >
          {isCompleted ? <Feather name="check" size={14} color={colors.cream[50]} /> : null}
        </AnimatedPressable>

        <View className="flex-1 flex-row items-start justify-between gap-2">
          <Text
            style={{ marginTop: -3 }}
            className={
              isCompleted
                ? "flex-1 font-grotesk-bold text-[19px] leading-6 text-ink-cream-muted line-through"
                : "flex-1 font-grotesk-bold text-[19px] leading-6 text-ink-cream"
            }
          >
            {task.title}
          </Text>
          <View className="pt-0.5">
            {isCompleted ? (
              <Ionicons name="checkmark-circle" size={18} color={colors.olive[500]} />
            ) : isOverdue ? (
              <View className="rounded bg-overdue-500 px-1.5 py-0.5">
                <Text className="font-grotesk-bold text-[10px] tracking-wider text-cream-50">OVERDUE</Text>
              </View>
            ) : (
              <Feather name="chevron-right" size={18} color={colors.ink.creamMuted} />
            )}
          </View>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <View className={`badge badge--${scoreTier} flex-row items-center gap-1.5`}>
          <GemLogo size={14} />
          <Text className="font-grotesk-semibold text-xs text-ink-cream">
            Score: <Text className="font-grotesk-bold">{task.priorityScore}</Text>
          </Text>
        </View>
        <MetaPill
          icon={<Feather name="calendar" size={13} color={colors.ink.creamMuted} />}
          label={isOverdue ? due.pillLabel : due.label}
        />
      </View>

      <View className="flex-row flex-wrap items-center gap-2">
        <MetaPill
          icon={<Feather name="clock" size={13} color={colors.ink.creamMuted} />}
          label={formatDuration(task.estimatedMinutes)}
        />
        <View className={`badge ${category.badgeClass} flex-row items-center gap-1.5`}>
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: category.dotColor }} />
          <Text className="font-grotesk-semibold text-xs text-ink-cream">{category.label}</Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}
