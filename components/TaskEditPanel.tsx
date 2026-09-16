import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { AnimatedPressable } from "@/components/AnimatedPressable";
import {
  CategoryPicker,
  computeDeadlineDate,
  DEADLINE_OPTIONS,
  DeadlineChip,
  DURATION_OPTIONS,
  DurationChip,
  parseCustomDeadline,
  SectionHeader,
  type DeadlineValue,
} from "@/components/TaskFormFields";
import { colors } from "@/constants/theme";
import { getDueInfo } from "@/lib/taskMeta";
import type { Task } from "@/types/task";

export type TaskEditChanges = Partial<Pick<Task, "title" | "category" | "estimatedMinutes" | "dueDate">>;

// "keep" leaves the deadline untouched until the user picks something else.
type DeadlineChoice = DeadlineValue | "keep" | "custom";

/**
 * Everything the pen icon on Task Details can change. Edits stay local
 * drafts until "Save changes", so backing out never half-updates a task.
 */
export function TaskEditPanel({
  task,
  onSave,
  onCancel,
}: {
  task: Task;
  onSave: (changes: TaskEditChanges) => void;
  onCancel: () => void;
}) {
  const isPresetDuration = DURATION_OPTIONS.some((option) => option.minutes === task.estimatedMinutes);

  const [title, setTitle] = useState(task.title);
  const [titleError, setTitleError] = useState(false);
  const [category, setCategory] = useState(task.category);

  const [durationMinutes, setDurationMinutes] = useState(task.estimatedMinutes);
  const [customDurationOpen, setCustomDurationOpen] = useState(!isPresetDuration);
  const [customDurationText, setCustomDurationText] = useState(isPresetDuration ? "" : String(task.estimatedMinutes));
  const [durationError, setDurationError] = useState(false);

  const [deadline, setDeadline] = useState<DeadlineChoice>("keep");
  const [customDeadlineText, setCustomDeadlineText] = useState("");
  const [deadlineError, setDeadlineError] = useState(false);

  // Previewed as if pending, so a completed task shows a date instead of "Completed".
  const describeDeadline = (dueDate: string | undefined) =>
    getDueInfo({ ...task, status: "pending", dueDate }).pillLabel;

  const deadlineCaption =
    deadline === "keep"
      ? `Current deadline: ${describeDeadline(task.dueDate)}`
      : deadline === "custom"
        ? "e.g. 2026-09-15 14:30"
        : deadline === "none"
          ? "The deadline will be removed."
          : `New deadline: ${describeDeadline(computeDeadlineDate(deadline)?.toISOString())}`;

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleError(true);
      return;
    }

    const estimatedMinutes = customDurationOpen ? Number.parseInt(customDurationText.trim(), 10) : durationMinutes;
    if (customDurationOpen && (!/^\d+$/.test(customDurationText.trim()) || estimatedMinutes <= 0)) {
      setDurationError(true);
      return;
    }

    const changes: TaskEditChanges = { title: trimmedTitle, category, estimatedMinutes };

    if (deadline === "custom") {
      const customDate = parseCustomDeadline(customDeadlineText);
      if (!customDate) {
        setDeadlineError(true);
        return;
      }
      changes.dueDate = customDate.toISOString();
    } else if (deadline !== "keep") {
      // "No deadline" deliberately sets dueDate to undefined, clearing it.
      changes.dueDate = computeDeadlineDate(deadline)?.toISOString();
    }

    onSave(changes);
  };

  return (
    <View className="gap-6 rounded-2xl border border-cream-300 bg-cream-50 p-4">
      <View className="flex-row items-center gap-2">
        <Feather name="edit-2" size={13} color={colors.orange[500]} />
        <Text className="eyebrow text-orange-500">EDIT TASK</Text>
      </View>

      <View className="gap-2">
        <Text className="eyebrow text-ink-cream">TASK TITLE</Text>
        <TextInput
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            setTitleError(false);
          }}
          placeholder="Task title"
          placeholderTextColor={colors.ink.creamMuted}
          returnKeyType="done"
          className={
            titleError
              ? "rounded-2xl border border-overdue-500 bg-cream-50 px-4 py-3 font-grotesk-semibold text-base text-ink-cream"
              : "rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3 font-grotesk-semibold text-base text-ink-cream"
          }
        />
        {titleError ? (
          <Text className="font-grotesk-medium text-xs text-overdue-500">Task title is required.</Text>
        ) : null}
      </View>

      <View className="gap-3">
        <Text className="eyebrow text-ink-cream">CATEGORY</Text>
        <CategoryPicker selectedId={category} onSelect={setCategory} />
      </View>

      <View className="gap-3">
        <SectionHeader
          icon={<Feather name="clock" size={14} color={colors.orange[500]} />}
          label="ESTIMATED DURATION"
          action={{ label: "Custom duration", onPress: () => setCustomDurationOpen((open) => !open) }}
        />
        <View className="flex-row flex-wrap gap-2">
          {DURATION_OPTIONS.map((option) => (
            <DurationChip
              key={option.minutes}
              label={option.label}
              selected={!customDurationOpen && durationMinutes === option.minutes}
              onPress={() => {
                setDurationMinutes(option.minutes);
                setCustomDurationOpen(false);
                setDurationError(false);
              }}
            />
          ))}
        </View>
        {customDurationOpen ? (
          <View className="flex-row items-center gap-2 rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3">
            <TextInput
              value={customDurationText}
              onChangeText={(text) => {
                setCustomDurationText(text);
                setDurationError(false);
              }}
              placeholder="Minutes, e.g. 50"
              placeholderTextColor={colors.ink.creamMuted}
              keyboardType="number-pad"
              className="flex-1 font-grotesk-regular text-sm text-ink-cream"
            />
            <Text className="font-grotesk-medium text-xs text-ink-cream-muted">min</Text>
          </View>
        ) : null}
        {durationError ? (
          <Text className="font-grotesk-medium text-xs text-overdue-500">Enter a positive whole number of minutes.</Text>
        ) : null}
      </View>

      <View className="gap-3">
        <SectionHeader
          icon={<Feather name="calendar" size={14} color={colors.orange[500]} />}
          label="DEADLINE"
          action={{
            label: "Specific date / time",
            onPress: () => setDeadline((current) => (current === "custom" ? "keep" : "custom")),
          }}
        />
        <View className="flex-row flex-wrap gap-2">
          {DEADLINE_OPTIONS.map((option) => (
            <DeadlineChip
              key={option.value}
              label={option.label}
              selected={deadline === option.value}
              onPress={() => {
                setDeadline(option.value);
                setDeadlineError(false);
              }}
            />
          ))}
        </View>
        {deadline === "custom" ? (
          <View className="rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3">
            <TextInput
              value={customDeadlineText}
              onChangeText={(text) => {
                setCustomDeadlineText(text);
                setDeadlineError(false);
              }}
              placeholder="YYYY-MM-DD HH:mm"
              placeholderTextColor={colors.ink.creamMuted}
              className="font-grotesk-regular text-sm text-ink-cream"
            />
          </View>
        ) : null}
        <Text className="font-grotesk-medium text-xs text-ink-cream-muted">{deadlineCaption}</Text>
        {deadlineError ? (
          <Text className="font-grotesk-medium text-xs text-overdue-500">Enter a valid date and time.</Text>
        ) : null}
      </View>

      <View className="flex-row items-center justify-end gap-4">
        <AnimatedPressable onPress={onCancel} hitSlop={8} accessibilityRole="button" className="px-2 py-3">
          <Text className="font-grotesk-semibold text-sm text-ink-cream-muted">Cancel</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={handleSave} accessibilityRole="button" className="btn btn--primary flex-row gap-2 px-5 py-3">
          <Feather name="check" size={16} color={colors.cream[50]} />
          <Text className="font-grotesk-bold text-sm text-cream-50">Save changes</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}
