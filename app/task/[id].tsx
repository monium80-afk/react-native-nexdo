import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GemLogo } from "@/components/GemLogo";
import { DeadlineChip, parseCustomDeadline } from "@/components/TaskFormFields";
import { CATEGORY_META } from "@/constants/categories";
import { colors } from "@/constants/theme";
import { generateAdvice } from "@/lib/ai/generateAdvice";
import { formatDuration } from "@/lib/formatDuration";
import { getDueInfo } from "@/lib/taskMeta";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useTaskStore } from "@/store/useTaskStore";

type PostponeValue = "1d" | "3d" | "1w";

const POSTPONE_OPTIONS: { label: string; value: PostponeValue; days: number }[] = [
  { label: "+1 Day (Tomorrow)", value: "1d", days: 1 },
  { label: "+3 Days", value: "3d", days: 3 },
  { label: "+1 Week", value: "1w", days: 7 },
];

function computePostponeDate(currentDueDate: string | undefined, days: number, now: Date): Date {
  const base = currentDueDate ? new Date(currentDueDate) : new Date(now);
  base.setDate(base.getDate() + days);
  return base;
}

export default function TaskDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useTaskStore((state) => state.tasks.find((t) => t.id === id));
  const updateTask = useTaskStore((state) => state.updateTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const completeStep = useTaskStore((state) => state.completeStep);
  const addSubtask = useTaskStore((state) => state.addSubtask);
  const addContext = useTaskStore((state) => state.addContext);
  const regeneratePlan = useTaskStore((state) => state.regeneratePlan);
  const toggleTaskStatus = useTaskStore((state) => state.toggleTaskStatus);
  const planningStyle = useSettingsStore((state) => state.planningStyle);

  const [note, setNote] = useState("");
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task?.title ?? "");
  const [customPostponeOpen, setCustomPostponeOpen] = useState(false);
  const [customPostponeText, setCustomPostponeText] = useState("");

  const [advice, setAdvice] = useState("");

  useEffect(() => {
    if (!task) return;
    let cancelled = false;
    generateAdvice(task, planningStyle).then((result) => {
      if (!cancelled) setAdvice(result);
    });
    return () => {
      cancelled = true;
    };
    // Keyed on id/updatedAt (not the task object) — recalcAll gives every
    // pending task a fresh object identity whenever any task mutates, and
    // that would otherwise re-trigger a paid AI call on unrelated edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id, task?.updatedAt, planningStyle]);

  if (!task) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream[100] }}>
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <Text className="text-title text-ink-cream">Task not found</Text>
          <Pressable onPress={() => router.back()} className="btn btn--secondary-cream flex-row gap-2 px-6">
            <Feather name="arrow-left" size={16} color={colors.ink.cream} />
            <Text className="font-grotesk-semibold text-base text-ink-cream">Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const due = getDueInfo(task);
  const category = CATEGORY_META[task.category];
  const isCompleted = task.status === "completed";
  const orderedSubtasks = task.subtasks?.slice().sort((a, b) => a.order - b.order) ?? [];
  const completedSubtaskCount = orderedSubtasks.filter((subtask) => subtask.status === "completed").length;

  const handlePostpone = (days: number) => {
    const nextDate = computePostponeDate(task.dueDate, days, new Date());
    updateTask(task.id, { dueDate: nextDate.toISOString() });
    setCustomPostponeOpen(false);
  };

  const handleCustomPostpone = () => {
    const parsed = parseCustomDeadline(customPostponeText);
    if (!parsed) return;
    updateTask(task.id, { dueDate: parsed.toISOString() });
    setCustomPostponeOpen(false);
    setCustomPostponeText("");
  };

  const handleStartEditTitle = () => {
    setTitleDraft(task.title);
    setEditingTitle(true);
  };

  const handleCommitTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== task.title) updateTask(task.id, { title: trimmed });
    setEditingTitle(false);
  };

  const handleAddSubtask = () => {
    const trimmed = subtaskDraft.trim();
    if (!trimmed) return;
    addSubtask(task.id, trimmed);
    setSubtaskDraft("");
  };

  const handleSendNote = () => {
    const trimmed = note.trim();
    if (!trimmed) return;
    addContext(task.id, trimmed);
    setNote("");
  };

  const handleFocusNow = () => {
    router.push("/(tabs)");
  };

  const handleDelete = () => {
    Alert.alert("Delete this task?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteTask(task.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream[100] }} edges={["top"]}>
      <View className="gap-2.5 border-b border-cream-300 bg-cream-100 px-5 pb-4 pt-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <GemLogo size={18} />
            <Text className="eyebrow text-ink-cream">TASK DETAILS</Text>
          </View>
          <Pressable onPress={() => router.back()} hitSlop={8} className="h-9 w-9 items-center justify-center">
            <Feather name="x" size={22} color={colors.ink.cream} />
          </Pressable>
        </View>
        <View className="flex-row flex-wrap items-center gap-2">
          <View className="flex-row items-center gap-1.5 rounded-2xl border border-orange-500 px-3 py-1.5">
            <GemLogo size={12} />
            <Text className="font-grotesk-semibold text-xs text-orange-600">
              Score: <Text className="font-grotesk-bold">{task.priorityScore}</Text>
            </Text>
          </View>
          <Pressable
            onPress={handleFocusNow}
            className="flex-row items-center gap-1.5 rounded-2xl bg-orange-100 px-3 py-1.5"
          >
            <Feather name="target" size={13} color={colors.orange[600]} />
            <Text className="font-grotesk-semibold text-xs text-orange-600">Focus Now</Text>
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          className="bg-cream-100"
          contentContainerStyle={{ padding: 24, gap: 22, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-4 rounded-2xl bg-cream-200 p-5">
            <View className="flex-row items-start gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-cream-300">
                <Feather name="calendar" size={18} color={colors.orange[500]} />
              </View>
              <View className="flex-1 gap-1">
                <Text className="font-grotesk-bold text-sm text-ink-cream">POSTPONE TASK</Text>
                <Text className="font-grotesk-regular text-xs text-ink-cream-muted">
                  Current deadline: &quot;{due.label}&quot;. Push to a later date:
                </Text>
              </View>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {POSTPONE_OPTIONS.map((option) => (
                <DeadlineChip
                  key={option.value}
                  label={option.label}
                  selected={false}
                  onPress={() => handlePostpone(option.days)}
                />
              ))}
              <DeadlineChip
                label="Custom Date..."
                selected={customPostponeOpen}
                onPress={() => setCustomPostponeOpen((open) => !open)}
              />
            </View>
            {customPostponeOpen ? (
              <View className="gap-2 rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3">
                <TextInput
                  value={customPostponeText}
                  onChangeText={setCustomPostponeText}
                  placeholder="YYYY-MM-DD HH:mm"
                  placeholderTextColor={colors.ink.creamMuted}
                  className="font-grotesk-regular text-sm text-ink-cream"
                />
                <Pressable
                  onPress={handleCustomPostpone}
                  disabled={!customPostponeText.trim()}
                  className="self-start rounded-2xl bg-orange-500 px-4 py-1.5"
                >
                  <Text className="font-grotesk-semibold text-xs text-cream-50">Set date</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <View className="flex-row items-start justify-between gap-3">
            {editingTitle ? (
              <TextInput
                value={titleDraft}
                onChangeText={setTitleDraft}
                onSubmitEditing={handleCommitTitle}
                onBlur={handleCommitTitle}
                autoFocus
                returnKeyType="done"
                className="flex-1 text-title text-ink-cream"
              />
            ) : (
              <Text className="flex-1 text-title text-ink-cream">{task.title}</Text>
            )}
            <Pressable onPress={editingTitle ? handleCommitTitle : handleStartEditTitle} hitSlop={8} className="pt-1">
              <Feather name={editingTitle ? "check" : "edit-2"} size={18} color={colors.ink.creamMuted} />
            </Pressable>
          </View>

          <View className="flex-row flex-wrap gap-2">
            <View className="flex-row items-center gap-1.5 rounded-xl border border-cream-300 px-3 py-1.5">
              <Feather name="folder" size={13} color={colors.ink.creamMuted} />
              <Text className="font-grotesk-medium text-xs text-ink-cream">{category.label}</Text>
            </View>
            <View className="flex-row items-center gap-1.5 rounded-xl bg-cream-200 px-3 py-1.5">
              <Feather name="calendar" size={13} color={colors.ink.creamMuted} />
              <Text className="font-grotesk-medium text-xs text-ink-cream">Due: {due.label}</Text>
            </View>
            <View className="flex-row items-center gap-1.5 rounded-xl bg-cream-200 px-3 py-1.5">
              <Feather name="clock" size={13} color={colors.orange[500]} />
              <Text className="font-grotesk-semibold text-xs text-orange-600">
                Est: {formatDuration(task.estimatedMinutes)}
              </Text>
            </View>
          </View>

          <View className="gap-2 rounded-2xl bg-cream-200 p-5">
            <View className="flex-row items-center gap-2">
              <Ionicons name="sparkles" size={16} color={colors.orange[500]} />
              <Text className="font-grotesk-semibold text-sm text-orange-500">AI priority rationale</Text>
            </View>
            <Text className="text-quote text-ink-cream">&quot;{advice}&quot;</Text>
          </View>

          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="font-grotesk-medium text-sm text-ink-cream-muted">
                Subtasks ({completedSubtaskCount}/{orderedSubtasks.length})
              </Text>
              <Pressable
                onPress={() => regeneratePlan(task.id)}
                className="flex-row items-center gap-1.5 rounded-2xl border border-orange-500 px-3 py-1.5"
              >
                <Feather name="list" size={13} color={colors.orange[500]} />
                <Text className="font-grotesk-semibold text-xs text-orange-500">AI plan</Text>
              </Pressable>
            </View>

            {orderedSubtasks.length > 0 ? (
              <View className="gap-2">
                {orderedSubtasks.map((subtask) => {
                  const done = subtask.status === "completed";
                  return (
                    <Pressable
                      key={subtask.id}
                      onPress={() => task.status === "pending" && subtask.status === "current" && completeStep(task.id, subtask.id)}
                      className="flex-row items-center gap-3 rounded-2xl bg-cream-200 px-4 py-3.5"
                    >
                      <View
                        className={
                          done
                            ? "h-6 w-6 items-center justify-center rounded-lg bg-orange-500"
                            : "h-6 w-6 rounded-lg border-2 border-cream-300"
                        }
                      >
                        {done ? <Feather name="check" size={14} color={colors.cream[50]} /> : null}
                      </View>
                      <Text
                        className={
                          done
                            ? "flex-1 font-grotesk-medium text-sm text-ink-cream-muted line-through"
                            : "flex-1 font-grotesk-semibold text-sm text-ink-cream"
                        }
                      >
                        {subtask.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <View className="flex-row items-center gap-2">
              <TextInput
                value={subtaskDraft}
                onChangeText={setSubtaskDraft}
                onSubmitEditing={handleAddSubtask}
                placeholder="Add subtask..."
                placeholderTextColor={colors.ink.creamMuted}
                returnKeyType="done"
                className="flex-1 rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3 font-grotesk-regular text-sm text-ink-cream"
              />
              <Pressable
                onPress={handleAddSubtask}
                disabled={!subtaskDraft.trim()}
                className="h-11 w-11 items-center justify-center rounded-2xl"
                style={{ backgroundColor: subtaskDraft.trim() ? colors.charcoal[600] : colors.cream[300] }}
              >
                <Feather name="plus" size={18} color={colors.ink.charcoal} />
              </Pressable>
            </View>
          </View>

          {task.notes ? (
            <View className="gap-2">
              <Text className="eyebrow text-ink-cream">NOTES</Text>
              <Text className="text-body text-ink-cream-muted">{task.notes}</Text>
            </View>
          ) : null}

          {task.aiContext.notes.length > 0 ? (
            <View className="gap-2">
              <Text className="eyebrow text-ink-cream">CONTEXT NEXDO KNOWS</Text>
              <View className="gap-1.5">
                {task.aiContext.notes.map((entry, index) => (
                  <View key={`${index}-${entry}`} className="flex-row gap-2">
                    <Text className="text-body text-orange-500">•</Text>
                    <Text className="flex-1 text-body text-ink-cream-muted">{entry}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View className="gap-3 rounded-2xl border border-cream-300 bg-cream-50 p-4">
            <View className="flex-row items-center gap-2">
              <Ionicons name="sparkles" size={16} color={colors.orange[500]} />
              <Text className="eyebrow text-ink-cream">ADD CONTEXT FOR AI</Text>
            </View>
            <View className="flex-row items-end gap-2 rounded-2xl border border-cream-300 bg-cream-100 px-4 py-2.5">
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="e.g. I already finished the research."
                placeholderTextColor={colors.ink.creamMuted}
                multiline
                style={{ textAlignVertical: "top", maxHeight: 120 }}
                className="flex-1 font-grotesk-regular text-sm text-ink-cream"
              />
              <Pressable onPress={handleSendNote} hitSlop={8} disabled={!note.trim()}>
                <Feather
                  name="send"
                  size={18}
                  color={note.trim() ? colors.orange[500] : colors.ink.creamMuted}
                />
              </Pressable>
            </View>
          </View>
        </ScrollView>

        <View className="flex-row items-center justify-between border-t border-cream-300 bg-cream-50 px-6 py-4">
          <Pressable onPress={handleDelete} hitSlop={8} className="flex-row items-center gap-2">
            <Feather name="trash-2" size={17} color={colors.overdue[500]} />
            <Text className="font-grotesk-semibold text-sm text-overdue-500">Delete Task</Text>
          </Pressable>
          <Pressable
            onPress={() => toggleTaskStatus(task.id)}
            className={isCompleted ? "btn btn--secondary-cream flex-row gap-2 px-6 py-3" : "btn btn--primary flex-row gap-2 px-6 py-3"}
          >
            <Feather name={isCompleted ? "rotate-ccw" : "check"} size={16} color={isCompleted ? colors.ink.cream : colors.cream[50]} />
            <Text
              className={
                isCompleted ? "font-grotesk-bold text-sm text-ink-cream" : "font-grotesk-bold text-sm text-cream-50"
              }
            >
              {isCompleted ? "Reopen task" : "Mark Complete"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
