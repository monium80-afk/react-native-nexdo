import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { AnimatedPressable } from "@/components/AnimatedPressable";
import { getCategoryTint } from "@/constants/categories";
import { colors } from "@/constants/theme";
import { useTranslation } from "@/hooks/useTranslation";
import { formatDuration } from "@/lib/formatDuration";
import { getDueInfo } from "@/lib/taskMeta";
import { useCategory } from "@/store/useCategoryStore";
import type { Task } from "@/types/task";

/**
 * One row of the proposed plan on the Next screen — deliberately a preview.
 * The steps themselves, the AI breakdown and the AI advice all live inside a
 * running session (see SessionRunTaskCard), so setting one up stays a
 * decision about *which* tasks fit the time, not about how to do them.
 */
export function SessionTaskCard({
  task,
  index,
  onDetails,
}: {
  task: Task;
  index: number;
  onDetails: (taskId: string) => void;
}) {
  const t = useTranslation();
  const category = useCategory(task.category);
  const categoryTint = getCategoryTint(category.color);
  const due = getDueInfo(task);
  const isOverdue = due.tone === "overdue";
  const subtasks = task.subtasks ?? [];
  const completedCount = subtasks.filter((subtask) => subtask.status === "completed").length;

  return (
    <View className="gap-3 rounded-2xl bg-cream-100 p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-row flex-1 items-start gap-3">
          <View className="h-7 w-7 items-center justify-center rounded-full bg-orange-500">
            <Text className="font-grotesk-bold text-xs text-cream-50">{index + 1}</Text>
          </View>
          <View className="flex-1 gap-2">
            <Text className="font-grotesk-bold text-[19px] leading-6 text-ink-cream">{task.title}</Text>
            <View className="flex-row flex-wrap items-center gap-2">
              <View className="badge flex-row items-center gap-1.5" style={{ backgroundColor: categoryTint[100] }}>
                <View className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryTint[500] }} />
                <Text className="font-grotesk-semibold text-xs text-ink-cream">{category.label}</Text>
              </View>
              <View className="flex-row items-center gap-1.5 rounded-xl bg-cream-200 px-2.5 py-1">
                <Feather name="calendar" size={11} color={isOverdue ? colors.overdue[500] : colors.ink.creamMuted} />
                <Text
                  className="font-grotesk-medium text-xs"
                  style={{ color: isOverdue ? colors.overdue[500] : colors.ink.creamMuted }}
                >
                  {isOverdue ? due.pillLabel : due.label}
                </Text>
              </View>
              {/* Progress only — how many steps there are helps you judge
                  whether the task fits, without spoiling the plan itself. */}
              {subtasks.length > 0 ? (
                <View className="flex-row items-center gap-1.5 rounded-xl bg-cream-200 px-2.5 py-1">
                  <Feather name="list" size={11} color={colors.ink.creamMuted} />
                  <Text className="font-grotesk-medium text-xs text-ink-cream-muted">
                    {t.next.stepsCompleted(completedCount, subtasks.length)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
        <View className="shrink-0 rounded-2xl bg-orange-100 px-3 py-1.5">
          <Text className="font-grotesk-semibold text-xs text-orange-600">
            {formatDuration(task.estimatedMinutes)}
          </Text>
        </View>
      </View>

      <AnimatedPressable
        onPress={() => onDetails(task.id)}
        hitSlop={8}
        className="flex-row items-center justify-end gap-1"
      >
        <Text className="font-grotesk-semibold text-xs text-ink-cream-muted">{t.next.details}</Text>
        <Feather name="chevron-right" size={14} color={colors.ink.creamMuted} />
      </AnimatedPressable>
    </View>
  );
}
