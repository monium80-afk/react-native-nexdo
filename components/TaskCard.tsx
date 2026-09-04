import { Feather, Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { GemLogo } from "@/components/GemLogo";
import { MetaPill } from "@/components/MetaPill";
import { CATEGORY_META } from "@/constants/categories";
import { colors } from "@/constants/theme";
import { formatDuration } from "@/lib/formatDuration";
import { getDueInfo, getScoreTier, type DueTone } from "@/lib/taskMeta";
import type { Task } from "@/types/task";

const DUE_TONE_COLOR: Record<DueTone, string> = {
  overdue: colors.overdue[500],
  urgent: colors.orange[500],
  upcoming: colors.amber[500],
  muted: colors.ink.creamMuted,
};

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
    <Pressable onPress={onPress} className={`card ${cardVariant} gap-3 p-5`}>
      <View className="flex-row items-start gap-3">
        <Pressable
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
        </Pressable>

        <View className="flex-1 flex-row items-start justify-between gap-2">
          <Text
            className={
              isCompleted
                ? "flex-1 font-grotesk-bold text-base text-ink-cream-muted line-through"
                : "flex-1 font-grotesk-bold text-base text-ink-cream"
            }
          >
            {task.title}
          </Text>
          <View className="flex-row items-center gap-1.5 pt-0.5">
            <Text className="font-grotesk-semibold text-sm" style={{ color: DUE_TONE_COLOR[due.tone] }}>
              {due.label}
            </Text>
            {isCompleted ? (
              <Ionicons name="checkmark-circle" size={16} color={colors.olive[500]} />
            ) : (
              <Feather name="chevron-right" size={16} color={colors.ink.creamMuted} />
            )}
          </View>
        </View>
      </View>

      {isOverdue ? (
        <View className="badge badge--overdue flex-row items-center gap-1.5">
          <Feather name="alert-triangle" size={12} color={colors.overdue[500]} />
          <Text className="font-grotesk-semibold text-xs text-overdue-500">OVERDUE</Text>
        </View>
      ) : null}

      <View className="flex-row flex-wrap gap-2">
        <View className={`badge badge--${scoreTier} flex-row items-center gap-1.5`}>
          <GemLogo size={14} />
          <Text className="font-grotesk-semibold text-xs text-ink-cream">
            Score: <Text className="font-grotesk-bold">{task.priorityScore}</Text>
          </Text>
        </View>
        <MetaPill
          icon={<Feather name="calendar" size={13} color={colors.ink.creamMuted} />}
          label={due.pillLabel}
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
    </Pressable>
  );
}
