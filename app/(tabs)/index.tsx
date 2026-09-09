import { useUser } from "@clerk/expo";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GemLogo } from "@/components/GemLogo";
import { SessionTaskCard } from "@/components/SessionTaskCard";
import { TaskPickerSheet } from "@/components/TaskPickerSheet";
import { colors } from "@/constants/theme";
import { formatDuration } from "@/lib/formatDuration";
import { posthog } from "@/lib/posthog";
import { buildSessionPlan, ENERGY_LEVELS, sumEstimatedMinutes, TIME_OPTIONS, type EnergyLevel } from "@/lib/sessionPlan";
import { useTaskStore } from "@/store/useTaskStore";

const ENERGY_ICONS: Record<EnergyLevel, keyof typeof Feather.glyphMap> = {
  ready: "zap",
  low: "coffee",
  procrastinating: "frown",
};

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Next() {
  const router = useRouter();
  const { user } = useUser();
  const { minutes: incomingMinutes } = useLocalSearchParams<{ minutes?: string }>();
  const tasks = useTaskStore((state) => state.tasks);
  const completeStep = useTaskStore((state) => state.completeStep);
  const regeneratePlan = useTaskStore((state) => state.regeneratePlan);

  // A time-budget statement in AI Chat (taxonomy 4.2) lands here via a
  // "minutes" param instead of being answered inline in the chat.
  const [selectedMinutes, setSelectedMinutes] = useState(() => {
    const parsed = incomingMinutes ? Number.parseInt(incomingMinutes, 10) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 45;
  });
  const [customMinutesOpen, setCustomMinutesOpen] = useState(false);
  const [customMinutesText, setCustomMinutesText] = useState("");
  const [energy, setEnergy] = useState<EnergyLevel>("ready");
  const [manualTaskIds, setManualTaskIds] = useState<string[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const pendingTasks = useMemo(() => tasks.filter((task) => task.status === "pending"), [tasks]);

  const recommendedTasks = useMemo(
    () => buildSessionPlan(pendingTasks, selectedMinutes, energy),
    [pendingTasks, selectedMinutes, energy],
  );

  const sessionTasks = useMemo(() => {
    if (manualTaskIds === null) return recommendedTasks;
    return pendingTasks.filter((task) => manualTaskIds.includes(task.id));
  }, [manualTaskIds, pendingTasks, recommendedTasks]);

  const totalMinutes = sumEstimatedMinutes(sessionTasks);

  const { greeting, dateLabel } = useMemo(() => {
    const now = new Date();
    return {
      greeting: getGreeting(now.getHours()),
      dateLabel: now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    };
  }, []);

  const handleSelectMinutes = (minutes: number) => {
    setSelectedMinutes(minutes);
    setCustomMinutesOpen(false);
    setManualTaskIds(null);
  };

  const handleCustomMinutesChange = (text: string) => {
    setCustomMinutesText(text);
    const parsed = Number.parseInt(text, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      setSelectedMinutes(parsed);
      setManualTaskIds(null);
    }
  };

  const handleSelectEnergy = (value: EnergyLevel) => {
    setEnergy(value);
    setManualTaskIds(null);
  };

  const handleBreakdownTask = (taskId: string) => {
    regeneratePlan(taskId);
  };

  const handleBreakdownSession = () => {
    sessionTasks.forEach((task) => {
      if (!task.subtasks || task.subtasks.length === 0) regeneratePlan(task.id);
    });
  };

  const handleAdvice = (taskId: string) => {
    router.push({ pathname: "/(tabs)/ai-chat", params: { taskId, mode: "analyze", minutes: String(selectedMinutes) } });
  };

  const handleDetails = (taskId: string) => {
    router.push({ pathname: "/task/[id]", params: { id: taskId } });
  };

  const handleOpenPicker = () => {
    setManualTaskIds(sessionTasks.map((task) => task.id));
    setPickerOpen(true);
  };

  const handleTogglePickerTask = (taskId: string) => {
    setManualTaskIds((current) => {
      const base = current ?? sessionTasks.map((task) => task.id);
      return base.includes(taskId) ? base.filter((id) => id !== taskId) : [...base, taskId];
    });
  };

  const handleStartSession = () => {
    if (sessionTasks.length === 0) return;
    posthog.capture("session_started", {
      available_minutes: selectedMinutes,
      energy_level: energy,
      task_count: sessionTasks.length,
    });
    router.push({
      pathname: "/session",
      params: { taskIds: sessionTasks.map((task) => task.id).join(","), minutes: String(selectedMinutes), energy },
    });
  };

  if (pendingTasks.length === 0) {
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
            <Text className="font-grotesk-bold text-xs tracking-[0.11em] text-orange-500">NEXDO NEXT</Text>
            <Text className="text-ink-charcoal-muted">•</Text>
            <Text className="font-grotesk-medium text-xs text-ink-charcoal-muted">{dateLabel}</Text>
          </View>
          <View className="flex-row items-center gap-2.5">
            <GemLogo size={26} onDark />
            <Text className="flex-1 font-grotesk-bold text-lg leading-[1.2] tracking-tight text-ink-charcoal">
              {greeting}
              {user?.firstName ? `, ${user.firstName}` : ""}. Here&apos;s what deserves your attention:
            </Text>
          </View>
        </View>

        <View className="gap-5 p-6 pt-5">
          <View className="card card--cream gap-4 p-5">
            <View className="flex-row items-center justify-between gap-2">
              <View className="flex-1 flex-row items-center gap-2">
                <Feather name="clock" size={14} color={colors.ink.cream} />
                <Text className="eyebrow flex-shrink text-ink-cream">HOW MUCH TIME HAVE YOU GOT?</Text>
              </View>
              <View className="shrink-0 rounded-2xl bg-orange-100 px-3 py-1.5">
                <Text className="font-grotesk-semibold text-xs text-orange-600">
                  {formatDuration(selectedMinutes)} selected
                </Text>
              </View>
            </View>

            <View className="flex-row flex-wrap gap-2">
              {TIME_OPTIONS.map((minutes) => {
                const selected = !customMinutesOpen && selectedMinutes === minutes;
                return (
                  <Pressable
                    key={minutes}
                    onPress={() => handleSelectMinutes(minutes)}
                    className={
                      selected
                        ? "rounded-2xl border border-orange-500 bg-orange-500 px-4 py-2.5"
                        : "rounded-2xl border border-cream-300 bg-cream-50 px-4 py-2.5"
                    }
                  >
                    <Text
                      className={
                        selected ? "font-grotesk-bold text-sm text-cream-50" : "font-grotesk-medium text-sm text-ink-cream"
                      }
                    >
                      {minutes} min
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setCustomMinutesOpen((open) => !open)}
                className={
                  customMinutesOpen
                    ? "rounded-2xl border border-orange-500 bg-orange-500 px-4 py-2.5"
                    : "rounded-2xl border border-cream-300 bg-cream-50 px-4 py-2.5"
                }
              >
                <Text
                  className={
                    customMinutesOpen ? "font-grotesk-bold text-sm text-cream-50" : "font-grotesk-medium text-sm text-ink-cream"
                  }
                >
                  Custom...
                </Text>
              </Pressable>
            </View>

            {customMinutesOpen ? (
              <View className="flex-row items-center gap-2 rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3">
                <TextInput
                  value={customMinutesText}
                  onChangeText={handleCustomMinutesChange}
                  placeholder="Minutes, e.g. 50"
                  placeholderTextColor={colors.ink.creamMuted}
                  keyboardType="number-pad"
                  className="flex-1 font-grotesk-regular text-sm text-ink-cream"
                />
                <Text className="font-grotesk-medium text-xs text-ink-cream-muted">min</Text>
              </View>
            ) : null}

            <Text className="font-grotesk-semibold text-sm text-ink-cream">Energy &amp; focus level:</Text>
            <View className="flex-row gap-2">
              {ENERGY_LEVELS.map((level) => {
                const selected = energy === level.value;
                return (
                  <Pressable
                    key={level.value}
                    onPress={() => handleSelectEnergy(level.value)}
                    className={
                      selected
                        ? "flex-1 flex-row items-center justify-center gap-1 rounded-2xl bg-charcoal-900 px-1 py-3"
                        : "flex-1 flex-row items-center justify-center gap-1 rounded-2xl bg-cream-100 px-1 py-3"
                    }
                  >
                    <Feather
                      name={ENERGY_ICONS[level.value]}
                      size={13}
                      color={selected ? colors.ink.charcoal : colors.ink.cream}
                    />
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                      className={
                        selected
                          ? "font-grotesk-semibold text-xs text-ink-charcoal"
                          : "font-grotesk-medium text-xs text-ink-cream"
                      }
                    >
                      {level.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="card card--cream gap-4 p-5">
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1 gap-1">
                <View className="flex-row items-center gap-2">
                  <Feather name="zap" size={14} color={colors.orange[500]} />
                  <Text className="eyebrow flex-shrink text-ink-cream">
                    SESSION PLAN <Text className="text-ink-cream-muted">• {sessionTasks.length} tasks</Text>
                  </Text>
                </View>
                <Text className="font-grotesk-regular text-xs text-ink-cream-muted">
                  Tasks optimized to fit your available time.
                </Text>
              </View>
              <View className="shrink-0 items-end gap-2">
                <Pressable
                  onPress={handleBreakdownSession}
                  className="flex-row items-center gap-1.5 rounded-2xl bg-charcoal-900 px-3 py-1.5"
                >
                  <Feather name="list" size={12} color={colors.ink.charcoal} />
                  <Text className="font-grotesk-semibold text-xs text-ink-charcoal">Break down</Text>
                </Pressable>
                <View className="rounded-2xl bg-cream-200 px-3 py-1">
                  <Text className="font-grotesk-semibold text-xs text-ink-cream">
                    {formatDuration(totalMinutes)} total
                  </Text>
                </View>
              </View>
            </View>

            <View className="gap-3">
              {sessionTasks.map((task, index) => (
                <SessionTaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  onToggleSubtask={completeStep}
                  onBreakdown={handleBreakdownTask}
                  onAdvice={handleAdvice}
                  onDetails={handleDetails}
                />
              ))}
            </View>
          </View>

          <Pressable
            onPress={handleStartSession}
            disabled={sessionTasks.length === 0}
            className="btn btn--primary flex-row gap-2"
          >
            <Feather name="play" size={18} color={colors.cream[50]} />
            <Text className="font-grotesk-bold text-lg text-cream-50">
              Start session ({formatDuration(totalMinutes)})
            </Text>
          </Pressable>

          <Pressable onPress={handleOpenPicker} className="mx-auto flex-row items-center gap-1.5">
            <Text className="font-grotesk-semibold text-sm text-ink-cream-muted">Swap or pick different tasks</Text>
            <Feather name="chevron-right" size={16} color={colors.ink.creamMuted} />
          </Pressable>
        </View>
      </ScrollView>

      <TaskPickerSheet
        visible={pickerOpen}
        tasks={pendingTasks}
        selectedIds={manualTaskIds ?? sessionTasks.map((task) => task.id)}
        onToggle={handleTogglePickerTask}
        onUseRecommended={() => setManualTaskIds(null)}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}
