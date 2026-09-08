import { useClerk, useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";
import { posthog } from "@/lib/posthog";
import { useChatStore } from "@/store/useChatStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useTaskStore } from "@/store/useTaskStore";
import type { PlanningStyle } from "@/types/settings";

const PLANNING_STYLE_OPTIONS: { value: PlanningStyle; label: string; description: string }[] = [
  { value: "minimal", label: "Minimal", description: "Just the next action." },
  { value: "balanced", label: "Balanced", description: "Advice plus a few steps." },
  { value: "detailed", label: "Detailed", description: "Full strategy and breakdown." },
];

export default function Settings() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const handleChatSignOut = useChatStore((state) => state.handleSignOut);
  const handleTaskSignOut = useTaskStore((state) => state.handleSignOut);
  const planningStyle = useSettingsStore((state) => state.planningStyle);
  const setPlanningStyle = useSettingsStore((state) => state.setPlanningStyle);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setSignOutError(null);
    try {
      posthog.capture('user_signed_out')
      posthog.reset()
      const cleanupResults = await Promise.allSettled([
        Promise.resolve().then(() => handleChatSignOut()),
        Promise.resolve().then(() => handleTaskSignOut()),
      ]);
      await signOut();
      if (cleanupResults.some((result) => result.status === "rejected")) {
        throw new Error("Store cleanup failed");
      }
    } catch {
      setSignOutError("Couldn't sign out. Try again.");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.charcoal[900] }}>
      <View className="flex-1 gap-6 px-6 pt-4">
        <Text className="text-title text-ink-charcoal">Settings</Text>

        <View className="card card--charcoal flex-row items-center gap-3 p-4">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-charcoal-600">
            <Feather name="user" size={20} color={colors.ink.charcoal} />
          </View>
          <View className="flex-1">
            <Text className="font-grotesk-semibold text-base text-ink-charcoal">
              {user?.fullName ?? user?.firstName ?? "Your account"}
            </Text>
            <Text className="font-grotesk-regular text-sm text-ink-charcoal-muted">
              {user?.primaryEmailAddress?.emailAddress ?? ""}
            </Text>
          </View>
        </View>

        <View className="card card--charcoal gap-3 p-4">
          <Text className="font-grotesk-semibold text-base text-ink-charcoal">Planning style</Text>
          <Text className="font-grotesk-regular text-sm text-ink-charcoal-muted">
            Controls how much detail Nexdo gives you on the Next page.
          </Text>
          <View className="gap-2">
            {PLANNING_STYLE_OPTIONS.map((option) => {
              const selected = planningStyle === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setPlanningStyle(option.value)}
                  className={
                    selected
                      ? "flex-row items-center justify-between rounded-2xl border border-orange-500 bg-orange-500/10 px-4 py-3"
                      : "flex-row items-center justify-between rounded-2xl border border-charcoal-600 px-4 py-3"
                  }
                >
                  <View>
                    <Text
                      className={
                        selected
                          ? "font-grotesk-semibold text-sm text-orange-500"
                          : "font-grotesk-semibold text-sm text-ink-charcoal"
                      }
                    >
                      {option.label}
                    </Text>
                    <Text className="font-grotesk-regular text-xs text-ink-charcoal-muted">
                      {option.description}
                    </Text>
                  </View>
                  {selected ? <Feather name="check" size={18} color={colors.orange[500]} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={handleSignOut}
          disabled={isSigningOut}
          className="card card--charcoal flex-row items-center gap-3 p-4"
          style={isSigningOut ? { opacity: 0.6 } : undefined}
        >
          <Feather name="log-out" size={18} color={colors.overdue[500]} />
          <Text className="font-grotesk-semibold text-base text-overdue-500">
            {isSigningOut ? "Signing out…" : "Sign out"}
          </Text>
        </Pressable>

        {signOutError ? (
          <Text className="text-sm font-grotesk-medium text-overdue-500">
            {signOutError}
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
