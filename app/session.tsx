import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";

export default function SessionScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream[100] }} edges={["top"]}>
      <View className="flex-row items-center justify-between border-b border-cream-300 px-6 pb-4 pt-2">
        <Text className="text-title text-ink-cream">Focus Session</Text>
        <Pressable onPress={() => router.back()} hitSlop={8} className="h-9 w-9 items-center justify-center">
          <Feather name="x" size={22} color={colors.ink.cream} />
        </Pressable>
      </View>
      <View className="flex-1 items-center justify-center gap-3 px-6">
        <Feather name="play-circle" size={40} color={colors.orange[500]} />
        <Text className="text-card-title text-ink-cream">Session view coming soon</Text>
        <Text className="text-body text-center text-ink-cream-muted">
          This is where your focus session will run.
        </Text>
      </View>
    </SafeAreaView>
  );
}
