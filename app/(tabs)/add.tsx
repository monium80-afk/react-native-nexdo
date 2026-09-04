import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GemLogo } from "@/components/GemLogo";
import { CATEGORY_META } from "@/constants/categories";
import { colors } from "@/constants/theme";
import { formatDuration } from "@/lib/formatDuration";
import { posthog } from "@/lib/posthog";
import { useTaskStore } from "@/store/useTaskStore";
import type { TaskCategory, TaskPriorityLevel, TaskStep } from "@/types/task";

type DeadlineValue = "today" | "tomorrow" | "friday" | "weekend" | "nextWeek" | "none";

const CATEGORY_ROWS: TaskCategory[][] = [
  ["school", "work"],
  ["personal", "other"],
];

const DURATION_OPTIONS: { label: string; minutes: number }[] = [
  { label: "15m", minutes: 15 },
  { label: "30m", minutes: 30 },
  { label: "45m", minutes: 45 },
  { label: "1h", minutes: 60 },
  { label: "1.5h", minutes: 90 },
  { label: "2h", minutes: 120 },
  { label: "3h+", minutes: 180 },
];

const DEADLINE_OPTIONS: { label: string; value: DeadlineValue }[] = [
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" },
  { label: "This Friday", value: "friday" },
  { label: "This Weekend", value: "weekend" },
  { label: "Next Week", value: "nextWeek" },
  { label: "No deadline", value: "none" },
];

const PRIORITY_OPTIONS: { value: TaskPriorityLevel; title: string; subtitle: string }[] = [
  { value: "high", title: "High Priority", subtitle: "Urgent focus" },
  { value: "medium", title: "Medium Priority", subtitle: "Standard importance" },
  { value: "low", title: "Low Priority", subtitle: "Flexible timing" },
];

const STEP_DURATIONS = [15, 30, 45, 60, 90, 120];

// "This Friday"/"This Weekend" resolve to the nearest upcoming Fri/Sat, today included.
function computeDeadlineDate(value: DeadlineValue): Date | undefined {
  const now = new Date();

  switch (value) {
    case "today": {
      const date = new Date(now);
      date.setHours(18, 0, 0, 0);
      return date;
    }
    case "tomorrow": {
      const date = new Date(now);
      date.setDate(date.getDate() + 1);
      date.setHours(18, 0, 0, 0);
      return date;
    }
    case "friday": {
      const date = new Date(now);
      date.setDate(date.getDate() + ((5 - date.getDay() + 7) % 7));
      date.setHours(18, 0, 0, 0);
      return date;
    }
    case "weekend": {
      const date = new Date(now);
      date.setDate(date.getDate() + ((6 - date.getDay() + 7) % 7));
      date.setHours(12, 0, 0, 0);
      return date;
    }
    case "nextWeek": {
      const date = new Date(now);
      date.setDate(date.getDate() + 7);
      date.setHours(18, 0, 0, 0);
      return date;
    }
    case "none":
    default:
      return undefined;
  }
}

function parseCustomDeadline(text: string): Date | undefined {
  if (!text.trim()) return undefined;
  const date = new Date(text.trim().replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function createStepId(): string {
  return `step-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function SectionHeader({
  icon,
  label,
  action,
}: {
  icon: ReactNode;
  label: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        {icon}
        <Text className="eyebrow text-ink-cream">{label}</Text>
      </View>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={8}>
          <Text className="font-grotesk-semibold text-sm text-orange-500">{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function CategoryOption({
  category,
  selected,
  onPress,
}: {
  category: TaskCategory;
  selected: boolean;
  onPress: () => void;
}) {
  const meta = CATEGORY_META[category];
  const tint = colors.category[category];

  return (
    <Pressable
      onPress={onPress}
      className="flex-1 flex-row items-center gap-2.5 rounded-2xl border px-4 py-3.5"
      style={{
        borderColor: selected ? tint[500] : colors.cream[300],
        backgroundColor: selected ? tint[100] : colors.cream[50],
      }}
    >
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.dotColor }} />
      <Text className="font-grotesk-semibold text-sm text-ink-cream">{meta.label}</Text>
    </Pressable>
  );
}

function DurationChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={
        selected
          ? "rounded-full border border-orange-500 bg-orange-500 px-4 py-2.5"
          : "rounded-full border border-cream-300 bg-cream-50 px-4 py-2.5"
      }
    >
      <Text
        className={
          selected ? "font-grotesk-bold text-sm text-cream-50" : "font-grotesk-medium text-sm text-ink-cream"
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DeadlineChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={
        selected
          ? "rounded-full border border-charcoal-900 bg-charcoal-900 px-4 py-2.5"
          : "rounded-full border border-cream-300 bg-cream-50 px-4 py-2.5"
      }
    >
      <Text
        className={
          selected ? "font-grotesk-bold text-sm text-ink-charcoal" : "font-grotesk-medium text-sm text-ink-cream"
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

function PriorityCard({
  title,
  subtitle,
  selected,
  onPress,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={
        selected
          ? "flex-1 gap-1 rounded-2xl border border-orange-500 bg-orange-100 p-3.5"
          : "flex-1 gap-1 rounded-2xl border border-cream-300 bg-cream-100 p-3.5"
      }
    >
      <Text
        className={
          selected ? "font-grotesk-bold text-sm text-orange-600" : "font-grotesk-bold text-sm text-ink-cream"
        }
      >
        {title}
      </Text>
      <Text
        className={
          selected
            ? "font-grotesk-medium text-xs text-orange-600"
            : "font-grotesk-medium text-xs text-ink-cream-muted"
        }
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}

export default function Add() {
  const router = useRouter();
  const addTask = useTaskStore((state) => state.addTask);

  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [category, setCategory] = useState<TaskCategory>("personal");

  const [durationMinutes, setDurationMinutes] = useState(45);
  const [customDurationOpen, setCustomDurationOpen] = useState(false);
  const [customDurationText, setCustomDurationText] = useState("");

  const [deadlineValue, setDeadlineValue] = useState<DeadlineValue>("tomorrow");
  const [customDeadlineOpen, setCustomDeadlineOpen] = useState(false);
  const [customDeadlineText, setCustomDeadlineText] = useState("");

  const [priorityLevel, setPriorityLevel] = useState<TaskPriorityLevel>("high");

  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [stepDraftLabel, setStepDraftLabel] = useState("");
  const [stepDraftMinutes, setStepDraftMinutes] = useState(15);

  const [notes, setNotes] = useState("");

  const handleCustomDurationChange = (text: string) => {
    setCustomDurationText(text);
    const parsed = Number.parseInt(text, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      setDurationMinutes(parsed);
    }
  };

  const handleCycleStepDuration = () => {
    setStepDraftMinutes((current) => {
      const index = STEP_DURATIONS.indexOf(current);
      return STEP_DURATIONS[(index + 1) % STEP_DURATIONS.length];
    });
  };

  const handleAddStep = () => {
    const label = stepDraftLabel.trim();
    if (!label) return;
    setSteps((current) => [...current, { id: createStepId(), label, estimatedMinutes: stepDraftMinutes }]);
    setStepDraftLabel("");
  };

  const handleRemoveStep = (id: string) => {
    setSteps((current) => current.filter((step) => step.id !== id));
  };

  const handleClose = () => {
    router.push("/(tabs)/tasks");
  };

  const handleOpenAiChat = () => {
    router.push("/(tabs)/ai-chat");
  };

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setTitleTouched(true);
      return;
    }

    const customDeadline = customDeadlineOpen ? parseCustomDeadline(customDeadlineText) : undefined;
    const dueDate = (customDeadline ?? computeDeadlineDate(deadlineValue))?.toISOString();

    addTask({
      title: trimmedTitle,
      category,
      estimatedMinutes: durationMinutes,
      dueDate,
      priorityLevel,
      notes,
      steps,
    });

    posthog.capture("task_created", {
      task_category: category,
      priority_level: priorityLevel,
      estimated_minutes: durationMinutes,
      has_deadline: Boolean(dueDate),
      step_count: steps.length,
    });

    router.push("/(tabs)/tasks");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.charcoal[900] }} edges={["top"]}>
      <View style={{ flex: 1, paddingTop: 28 }}>
        <View className="flex-1 overflow-hidden rounded-t-[28px] bg-cream-50">
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View className="flex-row items-start justify-between px-6 pb-5 pt-6">
              <View className="flex-row items-center gap-3">
                <GemLogo size={32} />
                <View>
                  <Text className="eyebrow text-orange-500">MANUAL ENTRY</Text>
                  <Text className="text-title text-ink-cream">Add New Task</Text>
                </View>
              </View>
              <Pressable onPress={handleClose} hitSlop={8} className="h-9 w-9 items-center justify-center">
                <Feather name="x" size={22} color={colors.ink.creamMuted} />
              </Pressable>
            </View>
            <View className="border-b border-cream-300" />

            <ScrollView
              className="flex-1"
              contentContainerStyle={{ padding: 24, gap: 24 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View className="gap-2">
                <View className="flex-row items-center gap-1">
                  <Text className="eyebrow text-ink-cream">TASK TITLE</Text>
                  <Text className="eyebrow text-orange-500">*</Text>
                </View>
                <TextInput
                  value={title}
                  onChangeText={(text) => {
                    setTitle(text);
                    if (titleTouched) setTitleTouched(false);
                  }}
                  placeholder="e.g. Complete Organic Chemistry lab writeup"
                  placeholderTextColor={colors.ink.creamMuted}
                  className={
                    titleTouched
                      ? "rounded-2xl border border-overdue-500 bg-cream-50 px-4 py-3.5 font-grotesk-regular text-sm text-ink-cream"
                      : "rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3.5 font-grotesk-regular text-sm text-ink-cream"
                  }
                />
                {titleTouched ? (
                  <Text className="font-grotesk-medium text-xs text-overdue-500">Task title is required.</Text>
                ) : null}
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
                          selected={category === value}
                          onPress={() => setCategory(value)}
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
                      }}
                    />
                  ))}
                </View>
                {customDurationOpen ? (
                  <View className="flex-row items-center gap-2 rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3">
                    <TextInput
                      value={customDurationText}
                      onChangeText={handleCustomDurationChange}
                      placeholder="Minutes, e.g. 50"
                      placeholderTextColor={colors.ink.creamMuted}
                      keyboardType="number-pad"
                      className="flex-1 font-grotesk-regular text-sm text-ink-cream"
                    />
                    <Text className="font-grotesk-medium text-xs text-ink-cream-muted">min</Text>
                  </View>
                ) : null}
              </View>

              <View className="gap-3">
                <SectionHeader
                  icon={<Feather name="calendar" size={14} color={colors.orange[500]} />}
                  label="DEADLINE"
                  action={{ label: "Specific date / time", onPress: () => setCustomDeadlineOpen((open) => !open) }}
                />
                <View className="flex-row flex-wrap gap-2">
                  {DEADLINE_OPTIONS.map((option) => (
                    <DeadlineChip
                      key={option.value}
                      label={option.label}
                      selected={!customDeadlineOpen && deadlineValue === option.value}
                      onPress={() => {
                        setDeadlineValue(option.value);
                        setCustomDeadlineOpen(false);
                      }}
                    />
                  ))}
                </View>
                {customDeadlineOpen ? (
                  <View className="gap-1.5 rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3">
                    <TextInput
                      value={customDeadlineText}
                      onChangeText={setCustomDeadlineText}
                      placeholder="YYYY-MM-DD HH:mm"
                      placeholderTextColor={colors.ink.creamMuted}
                      className="font-grotesk-regular text-sm text-ink-cream"
                    />
                    <Text className="font-grotesk-medium text-xs text-ink-cream-muted">
                      e.g. 2026-09-15 14:30
                    </Text>
                  </View>
                ) : null}
              </View>

              <View className="gap-3">
                <SectionHeader
                  icon={<Ionicons name="flame" size={15} color={colors.orange[500]} />}
                  label="PRIORITY LEVEL"
                />
                <View className="flex-row gap-3">
                  {PRIORITY_OPTIONS.map((option) => (
                    <PriorityCard
                      key={option.value}
                      title={option.title}
                      subtitle={option.subtitle}
                      selected={priorityLevel === option.value}
                      onPress={() => setPriorityLevel(option.value)}
                    />
                  ))}
                </View>
              </View>

              <View className="gap-3 rounded-2xl border border-cream-300 bg-cream-100 p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Feather name="check-square" size={14} color={colors.ink.cream} />
                    <Text className="font-grotesk-bold text-sm text-ink-cream">Plan Steps ({steps.length})</Text>
                  </View>
                  <Text className="font-grotesk-medium text-xs text-ink-cream-muted">Optional step plan</Text>
                </View>

                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={stepDraftLabel}
                    onChangeText={setStepDraftLabel}
                    placeholder="e.g. Step 1: Draft the introduction"
                    placeholderTextColor={colors.ink.creamMuted}
                    className="flex-1 rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3 font-grotesk-regular text-sm text-ink-cream"
                  />
                  <Pressable
                    onPress={handleCycleStepDuration}
                    className="flex-row items-center gap-1 rounded-2xl border border-cream-300 bg-cream-50 px-3 py-3"
                  >
                    <Text className="font-grotesk-medium text-sm text-ink-cream">{stepDraftMinutes}m</Text>
                    <Feather name="chevron-down" size={14} color={colors.ink.creamMuted} />
                  </Pressable>
                  <Pressable
                    onPress={handleAddStep}
                    disabled={!stepDraftLabel.trim()}
                    className="h-11 w-11 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: stepDraftLabel.trim() ? colors.orange[500] : colors.cream[200] }}
                  >
                    <Feather
                      name="plus"
                      size={18}
                      color={stepDraftLabel.trim() ? colors.cream[50] : colors.ink.creamMuted}
                    />
                  </Pressable>
                </View>

                {steps.length > 0 ? (
                  <View className="gap-2">
                    {steps.map((step, index) => (
                      <View
                        key={step.id}
                        className="flex-row items-center gap-2 rounded-2xl border border-cream-300 bg-cream-50 px-4 py-2.5"
                      >
                        <Text className="font-grotesk-bold text-xs text-ink-cream-muted">{index + 1}.</Text>
                        <Text className="flex-1 font-grotesk-medium text-sm text-ink-cream" numberOfLines={1}>
                          {step.label}
                        </Text>
                        <Text className="font-grotesk-medium text-xs text-ink-cream-muted">
                          {formatDuration(step.estimatedMinutes)}
                        </Text>
                        <Pressable onPress={() => handleRemoveStep(step.id)} hitSlop={8}>
                          <Feather name="x" size={14} color={colors.ink.creamMuted} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>

              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <Feather name="align-left" size={14} color={colors.ink.cream} />
                  <Text className="eyebrow text-ink-cream">NOTES & CONTEXT (OPTIONAL)</Text>
                </View>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add key requirements, instructions, or links..."
                  placeholderTextColor={colors.ink.creamMuted}
                  multiline
                  style={{ textAlignVertical: "top", minHeight: 90 }}
                  className="rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3.5 font-grotesk-regular text-sm text-ink-cream"
                />
              </View>
            </ScrollView>

            <View className="gap-4 border-t border-cream-300 bg-cream-50 px-6 pb-6 pt-4">
              <Pressable onPress={handleOpenAiChat} className="flex-row items-center justify-center gap-2">
                <Feather name="message-circle" size={16} color={colors.orange[500]} />
                <Text className="font-grotesk-semibold text-sm text-orange-500">Open AI Chat instead</Text>
              </Pressable>
              <View className="flex-row items-center gap-4">
                <Pressable onPress={handleClose} hitSlop={8} className="px-2 py-3.5">
                  <Text className="font-grotesk-semibold text-base text-ink-cream-muted">Cancel</Text>
                </Pressable>
                <Pressable onPress={handleSubmit} className="btn btn--primary flex-1 flex-row gap-2">
                  <Feather name="plus" size={18} color={colors.cream[50]} />
                  <Text className="font-grotesk-bold text-lg text-cream-50">Add Task</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </SafeAreaView>
  );
}
