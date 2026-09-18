import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ScrollView, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { AnimatedPressable } from "@/components/AnimatedPressable";
import { GemLogo } from "@/components/GemLogo";
import { NextTaskCard } from "@/components/NextTaskCard";
import { colors } from "@/constants/theme";
import { useTranslation } from "@/hooks/useTranslation";
import { posthog } from "@/lib/posthog";
import { useSessionStore } from "@/store/useSessionStore";
import { useTaskStore } from "@/store/useTaskStore";
import type { Task } from "@/types/task";

const SIDE_PADDING = 24;
// At rest the next task's card already sits under this one — smaller and
// nudged right, so its edge shows. It grows into place as this one leaves.
const BACK_CARD_SCALE = 0.94;
const BACK_CARD_OFFSET = 18;
const UNDER_CARD_OPACITY = 0.5;
const FLY_OUT_MS = 220;

export default function Next() {
  const t = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const tasks = useTaskStore((state) => state.tasks);
  // A session runs inside its own task's card (see NextTaskCard), so the
  // stack stays swipeable while the clock ticks.
  const activeSession = useSessionStore((state) => state.session);
  const startSession = useSessionStore((state) => state.start);
  const leaveSession = useSessionStore((state) => state.leave);

  const [activeIndex, setActiveIndex] = useState(0);

  // Highest priority first.
  const pendingTasks = useMemo(
    () => tasks.filter((task) => task.status === "pending").sort((a, b) => b.priorityScore - a.priorityScore),
    [tasks],
  );
  const total = pendingTasks.length;
  const currentIndex = total === 0 ? 0 : Math.min(activeIndex, total - 1);
  const currentTask = pendingTasks[currentIndex];
  // The list has ends: nothing sits before #1 or after the last task.
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex + 1 < total;
  const nextTask = hasNext ? pendingTasks[currentIndex + 1] : undefined;
  const previousTask = hasPrevious ? pendingTasks[currentIndex - 1] : undefined;

  // How far the top card is dragged sideways. Past the threshold it flies off.
  const dragX = useSharedValue(0);
  const swipeThreshold = width * 0.25;
  const flyOutDistance = width * 1.4;
  // Where the previous card waits: exactly its own width past the left edge,
  // so dragging right reveals it pixel for pixel with the finger — the same
  // one-to-one feel as the card being dragged away.
  const returnDistance = width - SIDE_PADDING;
  // How far the finger travels for the card underneath to be fully in place.
  // Far longer than the threshold on purpose: it should keep moving with the
  // finger for the whole drag rather than snapping into place early.
  const trackDistance = width * 0.6;

  const goTo = (step: 1 | -1) =>
    setActiveIndex((index) => Math.min(Math.max(Math.min(index, total - 1) + step, 0), total - 1));

  // Put the (new) top card back in the middle once React has rendered it.
  useLayoutEffect(() => {
    dragX.set(0);
  }, [currentIndex, dragX]);

  // The session's card is gone once its task is finished or deleted — nothing
  // is left to show the clock, so the session ends with it.
  useEffect(() => {
    if (!activeSession) return;
    const stillRunning = pendingTasks.some((task) => activeSession.taskIds.includes(task.id));
    if (!stillRunning) leaveSession();
  }, [activeSession, pendingTasks, leaveSession]);

  // Swiping left sends this card away and brings the next one up from under
  // it; swiping right pulls the previous card back in over the top instead —
  // so "previous" only has to travel as far as the threshold to be fully in.
  const swipe = (direction: "next" | "previous") => {
    if (direction === "next" ? !hasNext : !hasPrevious) return;
    dragX.set(
      withTiming(direction === "next" ? -flyOutDistance : returnDistance, { duration: FLY_OUT_MS }, (finished) => {
        if (finished) scheduleOnRN(goTo, direction === "next" ? 1 : -1);
      }),
    );
  };

  const pan = Gesture.Pan()
    .enabled(total > 1)
    .activeOffsetX([-12, 12])
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      // At either end the card doesn't follow the finger that way at all.
      if (event.translationX > 0 && !hasPrevious) return;
      if (event.translationX < 0 && !hasNext) return;
      dragX.set(event.translationX);
    })
    .onEnd((event) => {
      const toLeft = event.translationX < 0;
      const flung = Math.abs(event.translationX) > swipeThreshold || Math.abs(event.velocityX) > 800;
      if (!flung || (toLeft && !hasNext) || (!toLeft && !hasPrevious)) {
        dragX.set(withSpring(0, { damping: 18, stiffness: 180 }));
        return;
      }
      dragX.set(
        withTiming(toLeft ? -flyOutDistance : returnDistance, { duration: FLY_OUT_MS }, (finished) => {
          if (finished) scheduleOnRN(goTo, toLeft ? 1 : -1);
        }),
      );
    });

  // Every style below reads `dragX.value` in its own body on purpose:
  // Reanimated works out what a style depends on from what the worklet reads
  // directly, so pulling the drag through a helper leaves the style without a
  // dependency on it — it then only recomputes on re-render, which is what
  // made the card underneath sit still and jump at the end of a swipe.

  const topCardStyle = useAnimatedStyle(() => {
    const drag = dragX.value;
    // Going forward it follows the finger; going back it settles into the
    // slot under the returning card instead.
    const returning = Math.min(Math.max(drag, 0) / trackDistance, 1);
    return {
      // Fades to the dimmed look of the under-slot it is settling into.
      opacity: interpolate(returning, [0, 1], [1, UNDER_CARD_OPACITY]),
      transform: [
        { translateX: drag < 0 ? drag : interpolate(returning, [0, 1], [0, BACK_CARD_OFFSET]) },
        { rotate: `${drag < 0 ? interpolate(drag, [-width, 0], [-8, 0], Extrapolation.CLAMP) : 0}deg` },
        { scale: interpolate(returning, [0, 1], [1, BACK_CARD_SCALE]) },
      ],
    };
  });

  // The card already sitting under this one — it moves to center, grows and
  // brightens in step with the drag, and drops out of sight while the
  // previous card comes back over it.
  const underCardStyle = useAnimatedStyle(() => {
    const drag = dragX.value;
    const leaving = Math.min(Math.max(-drag, 0) / trackDistance, 1);
    const returning = Math.min(Math.max(drag, 0) / trackDistance, 1);
    return {
      opacity: interpolate(leaving, [0, 1], [UNDER_CARD_OPACITY, 1]) * (1 - returning),
      transform: [
        { translateX: interpolate(leaving, [0, 1], [BACK_CARD_OFFSET, 0]) },
        { scale: interpolate(leaving, [0, 1], [BACK_CARD_SCALE, 1]) },
      ],
    };
  });

  // The previous card waits just off the left edge and comes back in above
  // everything, following the finger one-to-one.
  const returningCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: Math.min(dragX.value - returnDistance, 0) }],
  }));

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

  if (!currentTask) {
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

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.cream[100] }}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-2.5 px-6">
          <View className="h-3 w-3 rounded-full bg-orange-500" />
          <Text className="font-grotesk-bold text-[17px] text-ink-cream">{t.next.rankOf(currentIndex + 1, total)}</Text>
        </View>

        {/* The stack, bottom to top: the next task waits under this card, the
            current card follows the finger, and the previous card comes back
            in over both of them. */}
        <View style={{ marginTop: 28, marginHorizontal: SIDE_PADDING }}>
          {nextTask ? (
            <Animated.View
              pointerEvents="none"
              style={[{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }, underCardStyle]}
            >
              {/* No `key` on any of the three cards: reusing each slot's
                  component instance across a swap keeps the swipe smooth,
                  where remounting one stutters mid-animation. */}
              <NextTaskCard
                task={nextTask}
                rank={currentIndex + 2}
                preview
                onStart={() => {}}
                onDetails={() => {}}
              />
            </Animated.View>
          ) : null}

          <GestureDetector gesture={pan}>
            <Animated.View style={topCardStyle}>
              <NextTaskCard
                task={currentTask}
                rank={currentIndex + 1}
                onStart={(plannedMinutes) => handleStartSession(currentTask, plannedMinutes)}
                onDetails={() => handleDetails(currentTask.id)}
              />
            </Animated.View>
          </GestureDetector>

          {previousTask ? (
            <Animated.View
              pointerEvents="none"
              style={[{ position: "absolute", top: 0, right: 0, left: 0 }, returningCardStyle]}
            >
              <NextTaskCard
                task={previousTask}
                rank={currentIndex}
                onStart={() => {}}
                onDetails={() => {}}
              />
            </Animated.View>
          ) : null}
        </View>

        {total > 1 ? (
          <View className="mt-8 flex-row items-center gap-3 px-6">
            <AnimatedPressable
              onPress={() => swipe("previous")}
              disabled={!hasPrevious}
              accessibilityRole="button"
              accessibilityState={{ disabled: !hasPrevious }}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-full border border-cream-300 bg-cream-50 py-3.5"
              style={hasPrevious ? undefined : { opacity: 0.4 }}
            >
              <Feather name="arrow-left" size={17} color={colors.ink.cream} />
              <Text className="font-grotesk-bold text-base text-ink-cream">{t.next.previous}</Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => swipe("next")}
              disabled={!hasNext}
              accessibilityRole="button"
              accessibilityState={{ disabled: !hasNext }}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-full bg-charcoal-900 py-3.5"
              style={hasNext ? undefined : { opacity: 0.4 }}
            >
              <Text className="font-grotesk-bold text-base text-ink-charcoal">{t.next.nextCard}</Text>
              <Feather name="arrow-right" size={17} color={colors.ink.charcoal} />
            </AnimatedPressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
