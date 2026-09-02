import { useUser } from "@clerk/expo";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { GemLogo } from "@/components/GemLogo";
import { colors } from "@/constants/theme";
import { nextTasks } from "@/data/nextTasks";
import { useScreenEnterAnimation } from "@/hooks/useScreenEnterAnimation";
import { formatDuration } from "@/lib/formatDuration";
import type { TaskCategory } from "@/types/task";

const CATEGORY_META: Record<TaskCategory, { label: string; badgeClass: string; dotColor: string }> = {
  work: { label: "Work", badgeClass: "badge--work", dotColor: colors.category.work[500] },
  school: { label: "School", badgeClass: "badge--school", dotColor: colors.category.school[500] },
  personal: { label: "Personal", badgeClass: "badge--personal", dotColor: colors.category.personal[500] },
  other: { label: "Other", badgeClass: "badge--other", dotColor: colors.category.other[500] },
};

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function MetaPill({
  icon,
  label,
  surface = "raised",
}: {
  icon?: ReactNode;
  label: string;
  surface?: "raised" | "recessed";
}) {
  return (
    <View
      className={
        surface === "raised"
          ? "flex-row items-center gap-1.5 rounded-full border border-cream-300 bg-cream-100 px-3 py-1.5"
          : "flex-row items-center gap-1.5 rounded-full border border-cream-300 bg-cream-50 px-3 py-1.5"
      }
    >
      {icon}
      <Text className="font-grotesk-medium text-xs text-ink-cream">{label}</Text>
    </View>
  );
}

export default function Next() {
  const router = useRouter();
  const { user } = useUser();
  const enterStyle = useScreenEnterAnimation();
  const [taskIndex, setTaskIndex] = useState(0);
  const [note, setNote] = useState("");

  const task = nextTasks[taskIndex];
  const category = CATEGORY_META[task.category];

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

  const handleChooseSomethingElse = () => {
    setTaskIndex((index) => (index + 1) % nextTasks.length);
  };

  const handleSendNote = () => {
    const trimmedNote = note.trim();
    if (!trimmedNote) return;
    router.push({
      pathname: "/(tabs)/tasks",
      params: { taskId: task.id, note: trimmedNote },
    });
    setNote("");
  };

  const handleStartTask = () => router.push({ pathname: "/(tabs)/tasks", params: { taskId: task.id } });
  const handlePlanTask = () => router.push({ pathname: "/(tabs)/tasks", params: { taskId: task.id, mode: "plan" } });
  const handleAnalyzeTask = () => router.push({ pathname: "/(tabs)/ai-chat", params: { taskId: task.id, mode: "analyze" } });

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
              label={task.dueLabel}
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

            <Text className="text-body text-ink-cream">{task.whyThis.reasoning}</Text>

            <View className="flex-row gap-3 rounded-2xl border border-cream-300 bg-cream-50 p-4">
              <Feather name="target" size={16} color={colors.orange[500]} />
              <Text className="flex-1 text-body text-ink-cream">
                <Text className="font-grotesk-bold text-orange-500">Key Focus: </Text>
                {task.whyThis.keyFocus}
              </Text>
            </View>
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

          <View className="flex-row items-end gap-2 rounded-3xl border border-cream-300 bg-cream-100 px-5 py-3">
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
          onPress={handleChooseSomethingElse}
          className="btn btn--secondary-cream mx-auto flex-row gap-2 px-6"
        >
          <Text className="font-grotesk-semibold text-base text-ink-cream">
            Choose something else
          </Text>
          <Feather name="chevron-right" size={18} color={colors.ink.cream} />
        </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
