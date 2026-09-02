import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";

export default function Add() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream[100] }}>
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-title text-ink-cream">Add</Text>
      </View>
    </SafeAreaView>
  );
}
