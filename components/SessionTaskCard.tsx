import { Feather, Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { CATEGORY_META } from "@/constants/categories";
import { colors } from "@/constants/theme";
import { formatDuration } from "@/lib/formatDuration";
import type { Task } from "@/types/task";

export function SessionTaskCard({
  task,
  index,
  onToggleSubtask,
  onBreakdown,
  onAdvice,
  onDetails,
}: {
  task: Task;
  index: number;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onBreakdown: (taskId: string) => void;
  onAdvice: (taskId: string) => void;
  onDetails: (taskId: string) => void;
}) {
  const category = CATEGORY_META[task.category];
  const orderedSubtasks = task.subtasks?.slice().sort((a, b) => a.order - b.order) ?? [];
  const hasSubtasks = orderedSubtasks.length > 0;
  const completedCount = orderedSubtasks.filter((subtask) => subtask.status === "completed").length;

  return (
    <View className="gap-3 rounded-2xl bg-cream-100 p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-row flex-1 items-start gap-3">
          <View className="h-7 w-7 items-center justify-center rounded-full bg-orange-500">
            <Text className="font-grotesk-bold text-xs text-cream-50">{index + 1}</Text>
          </View>
          <View className="flex-1 gap-2">
            <Text className="font-grotesk-bold text-base text-ink-cream">{task.title}</Text>
            <View className="flex-row flex-wrap items-center gap-2">
              <View className={`badge ${category.badgeClass} flex-row items-center gap-1.5`}>
                <View className="h-2 w-2 rounded-full" style={{ backgroundColor: category.dotColor }} />
                <Text className="font-grotesk-semibold text-xs text-ink-cream">{category.label}</Text>
              </View>
              {hasSubtasks ? (
                <View className="flex-row items-center gap-1.5 rounded-xl bg-cream-200 px-2.5 py-1">
                  <Feather name="list" size={11} color={colors.ink.creamMuted} />
                  <Text className="font-grotesk-medium text-xs text-ink-cream-muted">
                    {completedCount}/{orderedSubtasks.length} steps completed
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

      {hasSubtasks ? (
        <View className="gap-2 rounded-2xl bg-cream-200 p-3.5">
          <Text className="eyebrow text-ink-cream-muted">SMALLER SUB-TASKS:</Text>
          {orderedSubtasks.map((subtask) => {
            const done = subtask.status === "completed";
            return (
              <Pressable
                key={subtask.id}
                onPress={() => task.status === "pending" && subtask.status === "current" && onToggleSubtask(task.id, subtask.id)}
                className="flex-row items-center gap-3"
              >
                <View
                  className={
                    done
                      ? "h-5 w-5 items-center justify-center rounded-md bg-orange-500"
                      : "h-5 w-5 rounded-md border-2 border-cream-300"
                  }
                >
                  {done ? <Feather name="check" size={12} color={colors.cream[50]} /> : null}
                </View>
                <Text
                  className={
                    done
                      ? "flex-1 font-grotesk-medium text-sm text-ink-cream-muted line-through"
                      : "flex-1 font-grotesk-medium text-sm text-ink-cream"
                  }
                >
                  {subtask.label}
                </Text>
                <Text className="font-grotesk-medium text-xs text-ink-cream-muted">
                  {formatDuration(subtask.estimatedMinutes)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1 flex-row flex-wrap items-center gap-2">
          <Pressable
            onPress={() => onBreakdown(task.id)}
            className="flex-row items-center gap-1.5 rounded-2xl bg-cream-200 px-3 py-1.5"
          >
            <Feather name="list" size={12} color={colors.ink.cream} />
            <Text className="font-grotesk-semibold text-xs text-ink-cream">
              {hasSubtasks ? "Edit breakdown" : "Break down task"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onAdvice(task.id)}
            className="flex-row items-center gap-1.5 rounded-2xl bg-cream-200 px-3 py-1.5"
          >
            <Ionicons name="bulb-outline" size={13} color={colors.ink.cream} />
            <Text className="font-grotesk-semibold text-xs text-ink-cream">AI Advice</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => onDetails(task.id)} hitSlop={8} className="shrink-0 flex-row items-center gap-1">
          <Text className="font-grotesk-semibold text-xs text-ink-cream-muted">Details</Text>
          <Feather name="chevron-right" size={14} color={colors.ink.creamMuted} />
        </Pressable>
      </View>
    </View>
  );
}
