import { useUser } from "@clerk/expo";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { FilterSheet } from "@/components/FilterSheet";
import { GemLogo } from "@/components/GemLogo";
import { MetaPill } from "@/components/MetaPill";
import { CATEGORY_META } from "@/constants/categories";
import { colors } from "@/constants/theme";
import { useScreenEnterAnimation } from "@/hooks/useScreenEnterAnimation";
import { generateAdvice } from "@/lib/ai/generateAdvice";
import { formatDuration } from "@/lib/formatDuration";
import { getDueInfo } from "@/lib/taskMeta";
import { posthog } from "@/lib/posthog";
import { rankTasksForNext } from "@/lib/scoring";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useTaskStore } from "@/store/useTaskStore";

const SKIP_REASONS: { label: string; value: string }[] = [
  { label: "Not enough time", value: "Not enough time right now." },
  { label: "Too difficult right now", value: "Too difficult to focus on right now." },
  { label: "Can't do it here", value: "Can't do this task in my current location." },
  { label: "Need something easier", value: "I need something easier right now." },
];

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Next() {
  const router = useRouter();
  const { user } = useUser();
  const enterStyle = useScreenEnterAnimation();
  const tasks = useTaskStore((state) => state.tasks);
  const skipTask = useTaskStore((state) => state.skipTask);
  const addContext = useTaskStore((state) => state.addContext);
  const planningStyle = useSettingsStore((state) => state.planningStyle);

  const [note, setNote] = useState("");
  const [skipSheetOpen, setSkipSheetOpen] = useState(false);

  const ranked = useMemo(() => rankTasksForNext(tasks), [tasks]);
  const task = ranked[0];

  const { greeting, dateLabel } = useMemo(() => {
    const now = new Date();
    return {
      greeting: getGreeting(now.getHours()),
      dateLabel: now.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    };
  }, []);

  const advice = useMemo(
    () => (task ? generateAdvice(task, planningStyle) : ""),
    [task, planningStyle],
  );
  const dueLabel = task ? getDueInfo(task).label : "";
  const category = task ? CATEGORY_META[task.category] : null;

  const handleSkip = (reason: string) => {
    if (!task) return;
    posthog.capture("task_skipped", {
      task_id: task.id,
      task_category: task.category,
      priority_score: task.priorityScore,
      reason,
    });
    skipTask(task.id, reason);
  };

  const handleSendNote = () => {
    const trimmedNote = note.trim();
    if (!trimmedNote || !task) return;
    posthog.capture("task_note_sent", {
      task_id: task.id,
      task_category: task.category,
      note_length: trimmedNote.length,
    });
    addContext(task.id, trimmedNote);
    setNote("");
  };

  const handleStartTask = () => {
    if (!task) return;
    posthog.capture("task_started", {
      task_id: task.id,
      task_category: task.category,
      priority_score: task.priorityScore,
    });
    router.push({ pathname: "/task/[id]", params: { id: task.id } });
  };
  const handlePlanTask = () => {
    if (!task) return;
    posthog.capture("task_plan_opened", {
      task_id: task.id,
      task_category: task.category,
      priority_score: task.priorityScore,
    });
    router.push({ pathname: "/task/[id]", params: { id: task.id } });
  };
  const handleAnalyzeTask = () => {
    if (!task) return;
    posthog.capture("task_analyze_opened", {
      task_id: task.id,
      task_category: task.category,
      priority_score: task.priorityScore,
    });
    router.push({ pathname: "/(tabs)/ai-chat", params: { taskId: task.id, mode: "analyze" } });
  };

  if (!task || !category) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.charcoal[900] }} edges={["top"]}>
        <View className="flex-1 items-center justify-center gap-3 bg-cream-100 px-6">
          <Ionicons name="checkmark-done-circle" size={40} color={colors.orange[500]} />
          <Text className="text-card-title text-ink-cream">All caught up</Text>
          <Text className="text-body text-center text-ink-cream-muted">
            You&apos;ve completed everything on your list. Add a new task to keep going.
          </Text>
          <Pressable onPress={() => router.push("/(tabs)/add")} className="btn btn--primary mt-2 flex-row gap-2 px-6">
            <Feather name="plus" size={16} color={colors.cream[50]} />
            <Text className="font-grotesk-bold text-base text-cream-50">Add a task</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.charcoal[900] }} edges={["top"]}>
      <ScrollView
        className="bg-cream-100"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-2.5 bg-charcoal-900 px-6 pb-4 pt-2">
          <View className="flex-row items-center gap-2">
            <Text className="font-grotesk-bold text-xs tracking-[0.11em] text-orange-500">
              NEXDO NEXT
            </Text>
            <Text className="text-ink-charcoal-muted">•</Text>
            <Text className="font-grotesk-medium text-xs text-ink-charcoal-muted">
              {dateLabel}
            </Text>
          </View>

          <View className="flex-row items-center gap-2.5">
            <GemLogo size={26} onDark />
            <Text className="flex-1 font-grotesk-bold text-lg leading-[1.2] tracking-tight text-ink-charcoal">
              {greeting}
              {user?.firstName ? `, ${user.firstName}` : ""}. Here&apos;s what
              deserves your attention:
            </Text>
          </View>
        </View>

        <View className="gap-5 p-6 pt-5">
        <Animated.View style={enterStyle} className="card card--cream-elevated gap-4 p-6">
          <View className="flex-row items-center justify-between">
            <Text className="eyebrow text-orange-500">NEXT UP</Text>
            <View className="badge badge--high flex-row items-center gap-1.5">
              <GemLogo size={14} />
              <Text className="font-grotesk-semibold text-xs text-ink-cream">
                Score <Text className="font-grotesk-bold">{task.priorityScore}</Text>
              </Text>
            </View>
          </View>

          <Text className="text-card-title text-ink-cream">{task.title}</Text>

          <View className="flex-row flex-wrap gap-2">
            <MetaPill
              icon={<Feather name="calendar" size={13} color={colors.ink.creamMuted} />}
              label={dueLabel}
            />
            <MetaPill
              icon={<Feather name="clock" size={13} color={colors.ink.creamMuted} />}
              label={`~${formatDuration(task.estimatedMinutes)}`}
            />
          </View>

          <View className={`badge ${category.badgeClass} flex-row items-center gap-1.5`}>
            <View
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: category.dotColor }}
            />
            <Text className="font-grotesk-semibold text-xs text-ink-cream">
              {category.label}
            </Text>
          </View>

          <View className="gap-3 rounded-2xl bg-cream-200 p-5">
            <View className="flex-row items-center gap-2">
              <Ionicons name="sparkles" size={16} color={colors.orange[500]} />
              <Text className="eyebrow text-ink-cream">WHY THIS?</Text>
            </View>

            <Text className="text-body text-ink-cream">{advice}</Text>
          </View>

          <Pressable
            onPress={handleStartTask}
            className="btn btn--primary flex-row gap-2"
            style={({ pressed }) => (pressed ? { opacity: 0.9 } : undefined)}
          >
            <Feather name="play" size={18} color={colors.cream[50]} />
            <Text className="font-grotesk-bold text-lg text-cream-50">Start</Text>
          </Pressable>

          <View className="flex-row gap-3">
            <Pressable onPress={handlePlanTask} className="btn btn--secondary-cream flex-1 flex-row gap-2">
              <Feather name="compass" size={16} color={colors.ink.cream} />
              <Text className="font-grotesk-semibold text-base text-ink-cream">Plan</Text>
            </Pressable>
            <Pressable onPress={handleAnalyzeTask} className="btn btn--secondary-cream flex-1 flex-row gap-2">
              <Feather name="bar-chart-2" size={16} color={colors.ink.cream} />
              <Text className="font-grotesk-semibold text-base text-ink-cream">Analyze</Text>
            </Pressable>
          </View>
        </Animated.View>

        <View className="card card--cream gap-4 p-5">
          <View className="flex-row items-center gap-2">
            <Ionicons name="sparkles" size={16} color={colors.orange[500]} />
            <Text className="eyebrow text-ink-cream">TELL NEXDO MORE ABOUT THIS TASK...</Text>
          </View>

          <View className="flex-row items-end gap-2 rounded-2xl border border-cream-300 bg-cream-100 px-5 py-3">
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="e.g. I only have 45 minutes tonight."
              placeholderTextColor={colors.ink.creamMuted}
              multiline
              style={{ textAlignVertical: "top", maxHeight: 140 }}
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
          onPress={() => setSkipSheetOpen(true)}
          className="btn btn--secondary-cream mx-auto flex-row gap-2 px-6"
        >
          <Text className="font-grotesk-semibold text-base text-ink-cream">
            Choose something else
          </Text>
          <Feather name="chevron-right" size={18} color={colors.ink.cream} />
        </Pressable>
        </View>
      </ScrollView>

      <FilterSheet
        visible={skipSheetOpen}
        title="WHY SKIP THIS?"
        options={SKIP_REASONS}
        selected=""
        onSelect={handleSkip}
        onClose={() => setSkipSheetOpen(false)}
      />
    </SafeAreaView>
  );
}
