import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";

export default function AiChat() {
  const { taskId, mode } = useLocalSearchParams<{
    taskId?: string;
    mode?: string;
  }>();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream[100] }}>
      <View className="flex-1 items-center justify-center gap-2 px-6">
        <Text className="text-title text-ink-cream">
          {mode === "analyze" && taskId ? "Analyzing Task" : "AI Chat"}
        </Text>
        {taskId ? (
          <Text className="text-body text-ink-cream-muted">Task: {taskId}</Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
