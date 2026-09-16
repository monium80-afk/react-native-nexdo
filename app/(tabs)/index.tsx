import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedPressable } from "@/components/AnimatedPressable";
import { GemLogo } from "@/components/GemLogo";
import { NextTaskCard } from "@/components/NextTaskCard";
import { SessionRunner } from "@/components/SessionRunner";
import { colors } from "@/constants/theme";
import { useTranslation } from "@/hooks/useTranslation";
import { posthog } from "@/lib/posthog";
import { useSessionStore } from "@/store/useSessionStore";
import { useTaskStore } from "@/store/useTaskStore";
import type { Task } from "@/types/task";

const SIDE_PADDING = 24;
const CARD_GAP = 12;
export default function Next() {
  const t = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const tasks = useTaskStore((state) => state.tasks);
  // A running session takes over this tab rather than pushing a route, so
  // the timer keeps running while the user wanders off to Tasks or the Assistant.
  const activeSession = useSessionStore((state) => state.session);
  const startSession = useSessionStore((state) => state.start);

  const [activeIndex, setActiveIndex] = useState(0);

  // Highest priority first — swiping moves down (or back up) the list.
  const pendingTasks = useMemo(
    () => tasks.filter((task) => task.status === "pending").sort((a, b) => b.priorityScore - a.priorityScore),
    [tasks],
  );

  const cardWidth = width - SIDE_PADDING * 2;
  const snapInterval = cardWidth + CARD_GAP;
  const currentIndex = Math.min(activeIndex, Math.max(pendingTasks.length - 1, 0));

  const handleStartSession = (task: Task, plannedMinutes: number) => {
    posthog.capture("session_started", {
      available_minutes: plannedMinutes,
      task_count: 1,
    });
    startSession({ taskIds: [task.id], plannedMinutes, energy: "ready" });
  };

  const handleDetails = (taskId: string) => {
    router.push({ pathname: "/task/[id]", params: { id: taskId } });
  };

  if (activeSession) {
    return <SessionRunner />;
  }

  if (pendingTasks.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.charcoal[900] }} edges={["top"]}>
        <View className="flex-1 items-center justify-center gap-3 bg-cream-100 px-6">
          <Ionicons name="checkmark-done-circle" size={40} color={colors.orange[500]} />
          <Text className="text-card-title text-ink-cream">{t.next.allCaughtUp}</Text>
          <Text className="text-body text-center text-ink-cream-muted">{t.next.allCaughtUpBody}</Text>
          <AnimatedPressable onPress={() => router.push("/add")} className="btn btn--primary mt-2 flex-row gap-2 px-6">
            <Feather name="plus" size={16} color={colors.cream[50]} />
            <Text className="font-grotesk-bold text-base text-cream-50">{t.next.addATask}</Text>
          </AnimatedPressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.charcoal[900] }} edges={["top"]}>
      <View className="gap-2.5 bg-charcoal-900 px-6 pb-4 pt-2">
        <View className="flex-row items-center gap-2">
          <Feather name="zap" size={12} color={colors.orange[500]} />
          <Text className="font-grotesk-bold text-xs tracking-[0.11em] text-orange-500">{t.next.eyebrow}</Text>
        </View>
        <View className="flex-row items-center gap-2.5">
          <GemLogo size={26} onDark />
          <Text className="flex-1 font-grotesk-bold text-lg leading-[1.2] tracking-tight text-ink-charcoal">
            {t.next.heading}
          </Text>
        </View>
      </View>

      <View className="flex-1 gap-4 bg-cream-100 pb-6 pt-5">
        <View className="flex-row items-center justify-between px-6">
          <View className="flex-row items-center gap-1.5">
            <Feather name="chevrons-left" size={14} color={colors.ink.creamMuted} />
            <Text className="font-grotesk-medium text-xs text-ink-cream-muted">{t.next.swipeHint}</Text>
            <Feather name="chevrons-right" size={14} color={colors.ink.creamMuted} />
          </View>
          <Text className="font-grotesk-bold text-sm text-ink-cream">
            {t.next.position(currentIndex + 1, pendingTasks.length)}
          </Text>
        </View>

        <FlatList
          data={pendingTasks}
          keyExtractor={(task) => task.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={snapInterval}
          decelerationRate="fast"
          disableIntervalMomentum
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: SIDE_PADDING, gap: CARD_GAP, paddingBottom: 8 }}
          onMomentumScrollEnd={(event) =>
            setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / snapInterval))
          }
          renderItem={({ item, index }) => (
            <NextTaskCard
              task={item}
              rank={index + 1}
              width={cardWidth}
              onStart={(plannedMinutes) => handleStartSession(item, plannedMinutes)}
              onDetails={() => handleDetails(item.id)}
            />
          )}
        />

        {pendingTasks.length > 1 ? (
          <View className="flex-row items-center justify-center gap-1.5 px-6">
            {pendingTasks.slice(0, 12).map((task, index) => (
              <View
                key={task.id}
                className={
                  index === currentIndex ? "h-2 w-5 rounded-full bg-orange-500" : "h-2 w-2 rounded-full bg-cream-300"
                }
              />
            ))}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
