import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedPressable } from "@/components/AnimatedPressable";
import { colors } from "@/constants/theme";
import { useScreenEnterAnimation } from "@/hooks/useScreenEnterAnimation";

export default function SessionScreen() {
  const router = useRouter();
  const enterStyle = useScreenEnterAnimation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream[100] }} edges={["top"]}>
      <View className="flex-row items-center justify-between border-b border-cream-300 px-6 pb-4 pt-2">
        <Text className="text-title text-ink-cream">Focus Session</Text>
        <AnimatedPressable onPress={() => router.back()} hitSlop={8} className="h-9 w-9 items-center justify-center">
          <Feather name="x" size={22} color={colors.ink.cream} />
        </AnimatedPressable>
      </View>
      <Animated.View style={[{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 24 }, enterStyle]}>
        <Feather name="play-circle" size={40} color={colors.orange[500]} />
        <Text className="text-card-title text-ink-cream">Session view coming soon</Text>
        <Text className="text-body text-center text-ink-cream-muted">
          This is where your focus session will run.
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}
