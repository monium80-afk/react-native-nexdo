import { useClerk, useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";
import { posthog } from "@/lib/posthog";

export default function Settings() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setSignOutError(null);
    try {
      posthog.capture('user_signed_out')
      posthog.reset()
      await signOut();
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
