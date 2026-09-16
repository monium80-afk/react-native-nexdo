import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedPressable } from "@/components/AnimatedPressable";
import { GemLogo } from "@/components/GemLogo";
import { SessionRunner } from "@/components/SessionRunner";
import { SessionTaskCard } from "@/components/SessionTaskCard";
import { TaskPickerSheet } from "@/components/TaskPickerSheet";
import { colors } from "@/constants/theme";
import { formatDuration } from "@/lib/formatDuration";
import { posthog } from "@/lib/posthog";
import { buildSessionPlan, ENERGY_LEVELS, sumEstimatedMinutes, TIME_OPTIONS, type EnergyLevel } from "@/lib/sessionPlan";
import { useSessionStore } from "@/store/useSessionStore";
import { useTaskStore } from "@/store/useTaskStore";

const ENERGY_ICONS: Record<EnergyLevel, keyof typeof Feather.glyphMap> = {
  ready: "zap",
  low: "coffee",
  procrastinating: "frown",
};

export default function Next() {
  const router = useRouter();
  const { minutes: incomingMinutes } = useLocalSearchParams<{ minutes?: string }>();
  const tasks = useTaskStore((state) => state.tasks);
  // A running session takes over this tab rather than pushing a route, so
  // the timer keeps running while the user wanders off to Tasks or Inbox.
  const activeSession = useSessionStore((state) => state.session);
  const startSession = useSessionStore((state) => state.start);

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
    startSession({
      taskIds: sessionTasks.map((task) => task.id),
      plannedMinutes: selectedMinutes,
      energy,
    });
  };

  if (activeSession) {
    return <SessionRunner />;
  }

  if (pendingTasks.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.charcoal[900] }} edges={["top"]}>
        <View className="flex-1 items-center justify-center gap-3 bg-cream-100 px-6">
          <Ionicons name="checkmark-done-circle" size={40} color={colors.orange[500]} />
          <Text className="text-card-title text-ink-cream">All caught up</Text>
          <Text className="text-body text-center text-ink-cream-muted">
            You&apos;ve completed everything on your list. Add a new task to keep going.
          </Text>
          <AnimatedPressable onPress={() => router.push("/add")} className="btn btn--primary mt-2 flex-row gap-2 px-6">
            <Feather name="plus" size={16} color={colors.cream[50]} />
            <Text className="font-grotesk-bold text-base text-cream-50">Add a task</Text>
          </AnimatedPressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.charcoal[900] }} edges={["top"]}>
      <ScrollView
        style={{ backgroundColor: colors.cream[100] }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-2.5 bg-charcoal-900 px-6 pb-4 pt-2">
          <View className="flex-row items-center gap-2">
            <Feather name="zap" size={12} color={colors.orange[500]} />
            <Text className="font-grotesk-bold text-xs tracking-[0.11em] text-orange-500">NEXDO NOW</Text>
          </View>
          <View className="flex-row items-center gap-2.5">
            <GemLogo size={26} onDark />
            <Text className="flex-1 font-grotesk-bold text-lg leading-[1.2] tracking-tight text-ink-charcoal">
              What can you do right now?
            </Text>
          </View>
        </View>

        <View className="gap-5 p-6 pt-5">
          <View className="card card--cream gap-4 p-5">
            <View className="flex-row items-center gap-2">
              <Feather name="clock" size={14} color={colors.ink.cream} />
              <Text className="eyebrow flex-shrink text-ink-cream">HOW MUCH TIME HAVE YOU GOT?</Text>
            </View>

            <View className="gap-2">
              <View className="flex-row gap-2">
                {TIME_OPTIONS.slice(0, 4).map((minutes) => {
                  const selected = !customMinutesOpen && selectedMinutes === minutes;
                  return (
                    <AnimatedPressable
                      key={minutes}
                      onPress={() => handleSelectMinutes(minutes)}
                      className={
                        selected
                          ? "choice choice--selected-orange flex-1 items-center py-1.5"
                          : "choice choice--idle flex-1 items-center py-1.5"
                      }
                    >
                      <Text
                        className={
                          selected
                            ? "font-grotesk-bold text-sm text-cream-50"
                            : "font-grotesk-medium text-sm text-ink-cream"
                        }
                      >
                        {minutes} min
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>

              <View className="flex-row gap-2">
                {TIME_OPTIONS.slice(4).map((minutes) => {
                  const selected = !customMinutesOpen && selectedMinutes === minutes;
                  return (
                    <AnimatedPressable
                      key={minutes}
                      onPress={() => handleSelectMinutes(minutes)}
                      className={
                        selected
                          ? "choice choice--selected-orange flex-1 items-center py-1.5"
                          : "choice choice--idle flex-1 items-center py-1.5"
                      }
                    >
                      <Text
                        className={
                          selected ? "font-grotesk-bold text-sm text-cream-50" : "font-grotesk-medium text-sm text-ink-cream"
                        }
                      >
                        {minutes} min
                      </Text>
                    </AnimatedPressable>
                  );
                })}
                <AnimatedPressable
                  onPress={() => setCustomMinutesOpen((open) => !open)}
                  className={
                    customMinutesOpen
                      ? "choice choice--selected-orange flex-1 items-center py-1.5"
                      : "choice choice--idle flex-1 items-center py-1.5"
                  }
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    className={
                      customMinutesOpen
                        ? "font-grotesk-bold text-sm text-cream-50"
                        : "font-grotesk-medium text-sm text-ink-cream-muted"
                    }
                  >
                    Custom...
                  </Text>
                </AnimatedPressable>
              </View>
            </View>

            {customMinutesOpen ? (
              <View className="flex-row items-center gap-2 rounded-xl border border-cream-300 bg-cream-50 px-4 py-3">
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

            <View className="h-px bg-cream-300" />
            <Text className="font-grotesk-semibold text-sm text-ink-cream">Energy &amp; focus level:</Text>
            <View className="flex-row gap-2">
              {ENERGY_LEVELS.map((level) => {
                const selected = energy === level.value;
                return (
                  <AnimatedPressable
                    key={level.value}
                    onPress={() => handleSelectEnergy(level.value)}
                    className={
                      selected
                        ? "choice choice--selected-charcoal flex-1 flex-row items-center justify-center gap-1 px-1 py-3"
                        : "choice choice--idle flex-1 flex-row items-center justify-center gap-1 px-1 py-3"
                    }
                  >
                    <Feather
                      name={ENERGY_ICONS[level.value]}
                      size={13}
                      color={selected ? colors.orange[500] : colors.ink.creamMuted}
                    />
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                      className={
                        selected
                          ? "font-grotesk-semibold text-xs text-ink-charcoal"
                          : "font-grotesk-medium text-xs text-ink-cream"
                      }
                    >
                      {level.label}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>

          <View className="card card--cream gap-4 p-5">
            <View className="flex-row items-center justify-between gap-2">
              <View className="flex-1 flex-row items-center gap-2">
                <Feather name="zap" size={14} color={colors.orange[500]} />
                <Text className="eyebrow flex-shrink text-ink-cream">
                  SESSION PLAN{" "}
                  <Text className="text-ink-cream-muted">
                    • {sessionTasks.length} {sessionTasks.length === 1 ? "task" : "tasks"}
                  </Text>
                </Text>
              </View>
              <View className="shrink-0 rounded-2xl bg-cream-200 px-3 py-1">
                <Text className="font-grotesk-semibold text-xs text-ink-cream">
                  {formatDuration(totalMinutes)} total
                </Text>
              </View>
            </View>

            <View className="gap-3">
              {sessionTasks.map((task, index) => (
                <Animated.View key={task.id} entering={FadeInUp.delay(index * 60).duration(280)}>
                  <SessionTaskCard task={task} index={index} onDetails={handleDetails} />
                </Animated.View>
              ))}
            </View>
          </View>

          <AnimatedPressable
            onPress={handleStartSession}
            disabled={sessionTasks.length === 0}
            className="btn btn--primary flex-row gap-2"
          >
            <Feather name="play" size={18} color={colors.cream[50]} />
            <Text className="font-grotesk-bold text-lg text-cream-50">
              Start session ({formatDuration(totalMinutes)})
            </Text>
          </AnimatedPressable>

          <AnimatedPressable onPress={handleOpenPicker} className="mx-auto flex-row items-center gap-1.5">
            <Text className="font-grotesk-semibold text-sm text-ink-cream-muted">Swap or pick different tasks</Text>
            <Feather name="chevron-right" size={16} color={colors.ink.creamMuted} />
          </AnimatedPressable>
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
