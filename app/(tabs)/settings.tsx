import { useClerk, useUser } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";

export default function Settings() {
  const { user } = useUser();
  const { signOut } = useClerk();

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
          onPress={() => signOut()}
          className="card card--charcoal flex-row items-center gap-3 p-4"
        >
          <Feather name="log-out" size={18} color={colors.overdue[500]} />
          <Text className="font-grotesk-semibold text-base text-overdue-500">
            Sign out
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
