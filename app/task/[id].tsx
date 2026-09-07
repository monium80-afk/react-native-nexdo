import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GemLogo } from "@/components/GemLogo";
import {
    CATEGORY_ROWS,
    CategoryOption,
    computeDeadlineDate,
    DEADLINE_OPTIONS,
    DeadlineChip,
    DURATION_OPTIONS,
    DurationChip,
    SectionHeader,
    type DeadlineValue,
} from "@/components/TaskFormFields";
import { colors } from "@/constants/theme";
import { generateAdvice } from "@/lib/ai/generateAdvice";
import { formatDuration } from "@/lib/formatDuration";
import { getDueInfo, getScoreTier } from "@/lib/taskMeta";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useTaskStore } from "@/store/useTaskStore";

export default function TaskDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useTaskStore((state) => state.tasks.find((t) => t.id === id));
  const updateTask = useTaskStore((state) => state.updateTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const completeStep = useTaskStore((state) => state.completeStep);
  const addContext = useTaskStore((state) => state.addContext);
  const regeneratePlan = useTaskStore((state) => state.regeneratePlan);
  const toggleTaskStatus = useTaskStore((state) => state.toggleTaskStatus);
  const planningStyle = useSettingsStore((state) => state.planningStyle);

  const [note, setNote] = useState("");

  const advice = useMemo(() => (task ? generateAdvice(task, planningStyle) : ""), [task, planningStyle]);

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
  const scoreTier = getScoreTier(task.priorityScore);
  const isCompleted = task.status === "completed";

  const handleDeadlineSelect = (value: DeadlineValue) => {
    updateTask(task.id, { dueDate: computeDeadlineDate(value)?.toISOString() });
  };

  const handleSendNote = () => {
    const trimmed = note.trim();
    if (!trimmed) return;
    addContext(task.id, trimmed);
    setNote("");
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.charcoal[900] }} edges={["top"]}>
      <View className="flex-row items-center justify-between bg-charcoal-900 px-6 pb-4 pt-2">
        <Pressable onPress={() => router.back()} hitSlop={8} className="h-9 w-9 items-center justify-center">
          <Feather name="arrow-left" size={22} color={colors.ink.charcoal} />
        </Pressable>
        <Text className="text-title text-ink-charcoal">Task</Text>
        <Pressable onPress={handleDelete} hitSlop={8} className="h-9 w-9 items-center justify-center">
          <Feather name="trash-2" size={20} color={colors.overdue[500]} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          className="bg-cream-100"
          contentContainerStyle={{ padding: 24, gap: 24, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-3">
            <View className="flex-row flex-wrap items-center gap-2">
              <View className={`badge badge--${scoreTier} flex-row items-center gap-1.5`}>
                <GemLogo size={14} />
                <Text className="font-grotesk-semibold text-xs text-ink-cream">
                  Priority <Text className="font-grotesk-bold">{task.priorityScore}</Text>
                </Text>
              </View>
              <View className="badge flex-row items-center gap-1.5 border border-cream-300 bg-cream-50">
                <Ionicons name="flash" size={12} color={colors.orange[500]} />
                <Text className="font-grotesk-semibold text-xs text-ink-cream">
                  Suitability <Text className="font-grotesk-bold">{task.suitabilityScore}</Text>
                </Text>
              </View>
              <Text className="font-grotesk-semibold text-sm" style={{ color: colors.ink.creamMuted }}>
                {due.label}
              </Text>
            </View>
            <Text className="text-title text-ink-cream">{task.title}</Text>
          </View>

          <View className="gap-3">
            <Text className="eyebrow text-ink-cream">CATEGORY</Text>
            <View className="gap-3">
              {CATEGORY_ROWS.map((row) => (
                <View key={row.join("-")} className="flex-row gap-3">
                  {row.map((value) => (
                    <CategoryOption
                      key={value}
                      category={value}
                      selected={task.category === value}
                      onPress={() => updateTask(task.id, { category: value })}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>

          <View className="gap-3">
            <SectionHeader
              icon={<Feather name="clock" size={14} color={colors.orange[500]} />}
              label="ESTIMATED DURATION"
            />
            <View className="flex-row flex-wrap gap-2">
              {DURATION_OPTIONS.map((option) => (
                <DurationChip
                  key={option.minutes}
                  label={option.label}
                  selected={task.estimatedMinutes === option.minutes}
                  onPress={() => updateTask(task.id, { estimatedMinutes: option.minutes })}
                />
              ))}
            </View>
          </View>

          <View className="gap-3">
            <SectionHeader
              icon={<Feather name="calendar" size={14} color={colors.orange[500]} />}
              label="DEADLINE"
            />
            <View className="flex-row flex-wrap gap-2">
              {DEADLINE_OPTIONS.map((option) => (
                <DeadlineChip
                  key={option.value}
                  label={option.label}
                  selected={false}
                  onPress={() => handleDeadlineSelect(option.value)}
                />
              ))}
            </View>
          </View>

          <View className="gap-3 rounded-2xl bg-cream-200 p-5">
            <View className="flex-row items-center gap-2">
              <Ionicons name="sparkles" size={16} color={colors.orange[500]} />
              <Text className="eyebrow text-ink-cream">DO THIS NOW</Text>
            </View>
            <Text className="text-body text-ink-cream">{advice}</Text>
          </View>

          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="eyebrow text-ink-cream">PLAN</Text>
              {!task.subtasks || task.subtasks.length === 0 ? (
                <Pressable onPress={() => regeneratePlan(task.id)} hitSlop={8}>
                  <Text className="font-grotesk-semibold text-sm text-orange-500">Generate a step plan</Text>
                </Pressable>
              ) : null}
            </View>

            {task.subtasks && task.subtasks.length > 0 ? (
              <View className="gap-2">
                {task.subtasks
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((subtask) => {
                    const done = subtask.status === "completed";
                    const current = subtask.status === "current";
                    return (
                      <Pressable
                        key={subtask.id}
                        onPress={() => task.status === "pending" && subtask.status === "current" && completeStep(task.id, subtask.id)}
                        className="flex-row items-center gap-3 rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3"
                        style={current ? { borderColor: colors.orange[500] } : undefined}
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
                        <Text className="font-grotesk-medium text-xs text-ink-cream-muted">
                          {formatDuration(subtask.estimatedMinutes)}
                        </Text>
                      </Pressable>
                    );
                  })}
              </View>
            ) : (
              <Text className="text-body text-ink-cream-muted">
                This task doesn&apos;t need a step-by-step plan.
              </Text>
            )}
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
              <Text className="eyebrow text-ink-cream">TELL NEXDO MORE</Text>
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

          <Pressable
            onPress={() => toggleTaskStatus(task.id)}
            className={isCompleted ? "btn btn--secondary-cream flex-row gap-2" : "btn btn--primary flex-row gap-2"}
          >
            <Feather name={isCompleted ? "rotate-ccw" : "check"} size={18} color={isCompleted ? colors.ink.cream : colors.cream[50]} />
            <Text
              className={
                isCompleted ? "font-grotesk-bold text-lg text-ink-cream" : "font-grotesk-bold text-lg text-cream-50"
              }
            >
              {isCompleted ? "Reopen task" : "Mark complete"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
