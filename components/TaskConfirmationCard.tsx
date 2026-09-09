import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { CATEGORY_META } from "@/constants/categories";
import { colors } from "@/constants/theme";
import type { ExtractedTaskDraft } from "@/lib/ai/types";
import { formatDuration } from "@/lib/formatDuration";
import { computePriorityScore, PRIORITY_LEVEL_IMPORTANCE } from "@/lib/scoring";
import type { DueTone } from "@/lib/taskMeta";

const DUE_TONE_COLOR: Record<DueTone, string> = {
  overdue: colors.overdue[500],
  urgent: colors.orange[500],
  upcoming: colors.amber[500],
  muted: colors.ink.creamMuted,
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// A lighter-weight cousin of lib/taskMeta.ts's getDueInfo — that one takes a
// full Task, but a draft here hasn't been created yet and only has a
// dueDate to go on (no status/id/etc. to fabricate just to satisfy the type).
function previewDueLabel(dueDate: string | undefined, now: Date): { label: string; tone: DueTone } {
  if (!dueDate) return { label: "No deadline", tone: "muted" };
  const due = new Date(dueDate);
  const dayDiff = Math.round((startOfDay(due).getTime() - startOfDay(now).getTime()) / DAY_MS);
  if (dayDiff < 0) return { label: "Overdue", tone: "overdue" };
  if (dayDiff === 0) return { label: "Due today", tone: "urgent" };
  if (dayDiff === 1) return { label: "Due tomorrow", tone: "urgent" };
  if (dayDiff <= 6) return { label: due.toLocaleDateString("en-US", { weekday: "long" }), tone: "upcoming" };
  return { label: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }), tone: "upcoming" };
}

export function TaskConfirmationCard({
  draft,
  onAdd,
  onDismiss,
}: {
  draft: ExtractedTaskDraft;
  onAdd: () => void;
  onDismiss: () => void;
}) {
  const now = new Date();
  const category = CATEGORY_META[draft.category];
  // Previewed with medium importance — CREATE_TASK always lands as medium
  // priority (see useTaskStore's applyStructuredAction) until edited.
  const priorityScore = computePriorityScore(
    { dueDate: draft.dueDate, estimatedMinutes: draft.estimatedMinutes, importance: PRIORITY_LEVEL_IMPORTANCE.medium },
    now,
  );
  const due = previewDueLabel(draft.dueDate, now);

  return (
    <View className="card card--cream gap-4 border-orange-500 p-5">
      <View className="flex-row items-start justify-between gap-3">
        <Text className="flex-1 text-card-title text-ink-cream">{draft.title}</Text>
        <View className="flex-row items-center gap-2">
          <View className={`badge ${category.badgeClass}`}>
            <Text className="font-grotesk-semibold text-xs text-ink-cream">{category.label}</Text>
          </View>
          <View className="rounded-xl bg-charcoal-900 px-2.5 py-1">
            <Text className="font-grotesk-bold text-xs text-ink-charcoal">Priority {priorityScore}/100</Text>
          </View>
        </View>
      </View>

      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-4">
          <View className="flex-row items-center gap-1.5">
            <Feather name="clock" size={14} color={colors.orange[500]} />
            <Text className="font-grotesk-medium text-sm text-ink-cream">{formatDuration(draft.estimatedMinutes)}</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Feather name="calendar" size={14} color={DUE_TONE_COLOR[due.tone]} />
            <Text className="font-grotesk-medium text-sm" style={{ color: DUE_TONE_COLOR[due.tone] }}>
              {due.label}
            </Text>
          </View>
        </View>
        <Text className="font-grotesk-semibold text-sm text-ink-cream underline">Edit details</Text>
      </View>

      <View className="h-px bg-cream-300" style={{ marginHorizontal: -20 }} />

      <View className="flex-row items-center justify-end gap-5">
        <Pressable onPress={onDismiss} hitSlop={8}>
          <Text className="font-grotesk-semibold text-sm text-ink-cream-muted">Dismiss</Text>
        </Pressable>
        <Pressable onPress={onAdd} className="flex-row items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5">
          <Feather name="check" size={16} color={colors.cream[50]} />
          <Text className="font-grotesk-bold text-sm text-cream-50">Add Task</Text>
        </Pressable>
      </View>
    </View>
  );
}
