import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";

export default function Tasks() {
  const { taskId, note, mode } = useLocalSearchParams<{
    taskId?: string;
    note?: string;
    mode?: string;
  }>();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream[100] }}>
      <View className="flex-1 items-center justify-center gap-2 px-6">
        <Text className="text-title text-ink-cream">
          {mode === "plan" ? "Plan Task" : "Tasks"}
        </Text>
        {taskId ? (
          <Text className="text-body text-ink-cream-muted">Task: {taskId}</Text>
        ) : null}
        {note ? (
          <Text className="text-body text-ink-cream-muted">Note: {note}</Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
