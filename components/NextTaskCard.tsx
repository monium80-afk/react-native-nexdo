import { Feather, Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { AnimatedPressable } from "@/components/AnimatedPressable";
import { GemLogo } from "@/components/GemLogo";
import { MetaPill } from "@/components/MetaPill";
import { getCategoryTint } from "@/constants/categories";
import { colors } from "@/constants/theme";
import { useTranslation } from "@/hooks/useTranslation";
import { formatDuration } from "@/lib/formatDuration";
import { getDueInfo } from "@/lib/taskMeta";
import { useCategory } from "@/store/useCategoryStore";
import type { Task, TaskPriorityLevel } from "@/types/task";

// Score bands from types/task.ts: High >=75, Medium 45–74, Low <45.
function priorityLevelFor(score: number): TaskPriorityLevel {
  if (score >= 75) return "high";
  if (score >= 45) return "medium";
  return "low";
}

// Same colors as the priority picker on the Add Task form.
const PRIORITY_BADGE: Record<TaskPriorityLevel, { badge: string; text: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  high: { badge: "badge gap-1.5 bg-overdue-100", text: "font-grotesk-bold text-xs text-overdue-500", color: colors.overdue[500], icon: "flame" },
  medium: { badge: "badge gap-1.5 bg-amber-100", text: "font-grotesk-bold text-xs text-amber-500", color: colors.amber[500], icon: "alert-circle" },
  low: { badge: "badge gap-1.5 bg-olive-100", text: "font-grotesk-bold text-xs text-olive-500", color: colors.olive[500], icon: "leaf" },
};

/** One swipeable card on the Next page — a task's essentials and a way to start working on it. */
export function NextTaskCard({
  task,
  rank,
  width,
  onStart,
  onDetails,
}: {
  task: Task;
  rank: number;
  width: number;
  onStart: (plannedMinutes: number) => void;
  onDetails: () => void;
}) {
  const t = useTranslation();
  const category = useCategory(task.category);
  const categoryTint = getCategoryTint(category.color);
  const due = getDueInfo(task);
  const isOverdue = due.tone === "overdue";
  const level = priorityLevelFor(task.priorityScore);
  const priority = PRIORITY_BADGE[level];
  const subtasks = task.subtasks ?? [];
  const completedCount = subtasks.filter((subtask) => subtask.status === "completed").length;
  const plannedMinutes = task.estimatedMinutes > 0 ? task.estimatedMinutes : 25;

  return (
    <View className="card card--cream-elevated gap-5 p-5" style={{ width }}>
      <View className="flex-row items-center justify-between gap-3">
        <View className={priority.badge}>
          <Ionicons name={priority.icon} size={13} color={priority.color} />
          <Text className={priority.text}>{t.form.priorities[level]}</Text>
        </View>
        <View className="h-8 min-w-8 items-center justify-center rounded-full bg-orange-500 px-2">
          <Text className="font-grotesk-bold text-sm text-cream-50">#{rank}</Text>
        </View>
      </View>

      <Text numberOfLines={3} className="text-title text-ink-cream">
        {task.title}
      </Text>

      <View className="flex-row flex-wrap gap-2">
        <MetaPill
          icon={<View className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryTint[500] }} />}
          label={category.label}
          tint={categoryTint}
        />
        <MetaPill
          icon={<Feather name="calendar" size={13} color={isOverdue ? colors.overdue[500] : colors.ink.creamMuted} />}
          label={isOverdue ? due.pillLabel : due.label}
        />
        <MetaPill
          icon={<Feather name="clock" size={13} color={colors.ink.creamMuted} />}
          label={formatDuration(plannedMinutes)}
        />
        <MetaPill icon={<GemLogo size={13} />} label={t.tasks.score(task.priorityScore)} />
        {subtasks.length > 0 ? (
          <MetaPill
            icon={<Feather name="list" size={13} color={colors.ink.creamMuted} />}
            label={t.next.stepsCompleted(completedCount, subtasks.length)}
          />
        ) : null}
      </View>

      {task.notes ? (
        <Text numberOfLines={3} className="text-body text-ink-cream-muted">
          {task.notes}
        </Text>
      ) : null}

      <View className="mt-auto gap-3">
        <AnimatedPressable onPress={() => onStart(plannedMinutes)} className="btn btn--primary flex-row gap-2">
          <Feather name="play" size={18} color={colors.cream[50]} />
          <Text className="font-grotesk-bold text-lg text-cream-50">{t.next.startTaskSession}</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={onDetails} hitSlop={8} className="flex-row items-center justify-center gap-1">
          <Text className="font-grotesk-semibold text-sm text-ink-cream-muted">{t.next.details}</Text>
          <Feather name="chevron-right" size={15} color={colors.ink.creamMuted} />
        </AnimatedPressable>
      </View>
    </View>
  );
}
