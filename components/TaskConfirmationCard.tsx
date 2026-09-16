import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Platform, Text, TextInput, View } from "react-native";

import { AnimatedPressable } from "@/components/AnimatedPressable";
import { GemLogo } from "@/components/GemLogo";
import { findCategory, getCategoryTint } from "@/constants/categories";
import { colors } from "@/constants/theme";
import type { ExtractedTaskDraft } from "@/lib/ai/types";
import { formatDuration } from "@/lib/formatDuration";
import { computePriorityScore, PRIORITY_LEVEL_IMPORTANCE } from "@/lib/scoring";
import { useCategoryStore } from "@/store/useCategoryStore";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// A lighter-weight cousin of lib/taskMeta.ts's getDueInfo — that one takes a
// full Task, but a draft here hasn't been created yet and only has a
// dueDate to go on (no status/id/etc. to fabricate just to satisfy the type).
// No urgency tint here: this card is a preview, so the icons stay brand orange.
function previewDueLabel(dueDate: string | undefined, now: Date): string {
  if (!dueDate) return "No deadline";
  const due = new Date(dueDate);
  const dayDiff = Math.round((startOfDay(due).getTime() - startOfDay(now).getTime()) / DAY_MS);
  if (dayDiff < 0) return "Overdue";
  if (dayDiff === 0) return "Due today";
  if (dayDiff === 1) return "Due tomorrow";
  if (dayDiff <= 6) return due.toLocaleDateString("en-US", { weekday: "long" });
  return due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDueFieldValue(dueDate: string | undefined): string {
  if (!dueDate) return "No deadline";
  const due = new Date(dueDate);
  return `${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${due.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })}`;
}

/** Shared shell for the editable fields — a bordered pill matching the design. */
function EditField({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-1 rounded-xl border border-cream-300 bg-cream-50 px-3 py-2">{children}</View>
  );
}

export function TaskConfirmationCard({
  draft,
  onAdd,
  onDismiss,
  onChange,
}: {
  draft: ExtractedTaskDraft;
  onAdd: () => void;
  onDismiss: () => void;
  /** Writes edits back into the queued draft so "Add Task" saves what's on screen. */
  onChange?: (patch: Partial<ExtractedTaskDraft>) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  // "date" then "time" on Android, where the two pickers are separate dialogs.
  const [picker, setPicker] = useState<"date" | "time" | null>(null);

  const now = new Date();
  const categories = useCategoryStore((state) => state.categories);
  const category = findCategory(categories, draft.category);
  // Scored off the draft's own priority so this preview matches what
  // applyStructuredAction will actually save.
  const priorityScore = computePriorityScore(
    {
      dueDate: draft.dueDate,
      estimatedMinutes: draft.estimatedMinutes,
      importance: PRIORITY_LEVEL_IMPORTANCE[draft.priorityLevel],
    },
    now,
  );
  const dueLabel = previewDueLabel(draft.dueDate, now);

  const handleMinutesChange = (text: string) => {
    const parsed = Number.parseInt(text.replace(/\D/g, ""), 10);
    onChange?.({ estimatedMinutes: Number.isNaN(parsed) ? 0 : parsed });
  };

  const handlePickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    const mode = picker;
    setPicker(null);
    if (event.type === "dismissed" || !selected) return;
    const base = draft.dueDate ? new Date(draft.dueDate) : new Date();
    if (mode === "time") {
      base.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    } else {
      base.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      // iOS shows date and time in one spinner; Android needs a second dialog.
      if (Platform.OS === "ios") base.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    }
    onChange?.({ dueDate: base.toISOString() });
    if (mode === "date" && Platform.OS === "android") setPicker("time");
  };

  return (
    <View className="card card--cream gap-3 border-orange-500 p-4">
      <View className="flex-row items-center justify-between gap-2">
        {isEditing ? (
          <TextInput
            value={draft.title}
            onChangeText={(text) => onChange?.({ title: text })}
            placeholder="Task title"
            placeholderTextColor={colors.ink.creamMuted}
            style={{ flex: 1 }}
            className="rounded-xl border border-cream-300 bg-cream-50 px-3 py-2 font-grotesk-bold text-sm text-ink-cream"
          />
        ) : (
          <Text className="flex-1 font-grotesk-bold text-base text-ink-cream">{draft.title}</Text>
        )}
        <View className="flex-row items-center gap-2">
          <View className="badge" style={{ backgroundColor: getCategoryTint(category.color)[100] }}>
            <Text className="font-grotesk-semibold text-xs text-ink-cream">{category.label}</Text>
          </View>
          <View className="flex-row items-center gap-1.5 rounded-full bg-charcoal-900 px-2.5 py-1.5">
            <GemLogo size={14} onDark />
            <Text className="font-grotesk-bold text-xs text-ink-charcoal">{priorityScore}</Text>
          </View>
        </View>
      </View>

      {isEditing ? (
        <View className="gap-2.5">
          <View className="flex-row items-center gap-2.5">
            <Feather name="clock" size={14} color={colors.orange[500]} />
            <EditField>
              <TextInput
                value={draft.estimatedMinutes ? String(draft.estimatedMinutes) : ""}
                onChangeText={handleMinutesChange}
                keyboardType="number-pad"
                placeholder="Minutes"
                placeholderTextColor={colors.ink.creamSubtle}
                style={{ padding: 0 }}
                className="font-grotesk-medium text-sm text-ink-cream-subtle"
              />
            </EditField>
            <Feather name="calendar" size={14} color={colors.orange[500]} />
            <AnimatedPressable
              onPress={() => setPicker("date")}
              className="flex-1 rounded-xl border border-cream-300 bg-cream-50 px-3 py-2"
            >
              <Text className="font-grotesk-medium text-sm text-ink-cream-subtle">
                {formatDueFieldValue(draft.dueDate)}
              </Text>
            </AnimatedPressable>
          </View>

          <View className="flex-row items-center justify-between gap-2.5">
            <View className="flex-row items-center gap-2.5">
              <Feather name="folder" size={14} color={colors.orange[500]} />
              <AnimatedPressable
                onPress={() => setCategoryOpen((open) => !open)}
                className="flex-row items-center gap-2 rounded-xl border border-cream-300 bg-cream-50 px-3 py-2"
              >
                <Text className="font-grotesk-medium text-sm text-ink-cream-subtle">{category.label}</Text>
                <Feather name="chevron-down" size={14} color={colors.ink.creamSubtle} />
              </AnimatedPressable>
            </View>
            <AnimatedPressable
              onPress={() => {
                setIsEditing(false);
                setCategoryOpen(false);
              }}
              hitSlop={8}
            >
              <Text className="font-grotesk-medium text-sm text-ink-cream-subtle underline">Done editing</Text>
            </AnimatedPressable>
          </View>

          {categoryOpen ? (
            <View className="flex-row flex-wrap gap-2 pl-6">
              {categories.map((option) => {
                const tint = getCategoryTint(option.color);
                const selected = category.id === option.id;
                return (
                  <AnimatedPressable
                    key={option.id}
                    onPress={() => {
                      onChange?.({ category: option.id });
                      setCategoryOpen(false);
                    }}
                    className="flex-row items-center gap-2 rounded-xl border px-3 py-2"
                    style={{
                      borderColor: selected ? tint[500] : colors.cream[300],
                      backgroundColor: selected ? tint[100] : colors.cream[50],
                    }}
                  >
                    <View className="h-2 w-2 rounded-full" style={{ backgroundColor: tint[500] }} />
                    <Text className="font-grotesk-medium text-sm text-ink-cream">{option.label}</Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          ) : null}

          {picker ? (
            <DateTimePicker
              value={draft.dueDate ? new Date(draft.dueDate) : new Date()}
              mode={Platform.OS === "ios" ? "datetime" : picker}
              display={Platform.OS === "ios" ? "inline" : "default"}
              onChange={handlePickerChange}
            />
          ) : null}
        </View>
      ) : (
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-4">
            <View className="flex-row items-center gap-1.5">
              <Feather name="clock" size={14} color={colors.orange[500]} />
              <Text className="font-grotesk-medium text-sm text-ink-cream-subtle">
                {formatDuration(draft.estimatedMinutes)}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Feather name="calendar" size={14} color={colors.orange[500]} />
              <Text className="font-grotesk-medium text-sm text-ink-cream-subtle">{dueLabel}</Text>
            </View>
          </View>
          {/* Icon rather than an "Edit details" label — the row is tight on
              narrow screens and the text pushed past the card's edge. */}
          <AnimatedPressable
            onPress={() => setIsEditing(true)}
            hitSlop={10}
            accessibilityLabel="Edit task details"
          >
            <Feather name="edit-2" size={15} color={colors.ink.creamSubtle} />
          </AnimatedPressable>
        </View>
      )}

      <View className="h-px bg-cream-300" />

      <View className="flex-row items-center justify-end gap-4">
        <AnimatedPressable onPress={onDismiss} hitSlop={8}>
          <Text className="font-grotesk-semibold text-sm text-ink-cream-muted">Dismiss</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={onAdd} className="flex-row items-center gap-2 rounded-full bg-orange-500 px-4 py-2">
          <Feather name="check" size={16} color={colors.cream[50]} />
          <Text className="font-grotesk-bold text-sm text-cream-50">Add Task</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}
