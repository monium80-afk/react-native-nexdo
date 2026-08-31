import { useClerk, useUser } from "@clerk/expo";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";

export default function Home() {
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream[100] }}>
      <View className="flex-1 items-center justify-center gap-3 px-6">
        <Text className="text-title text-center text-ink-cream">
          Welcome, {user?.firstName ?? "there"}.
        </Text>
        <Text className="text-center text-base font-grotesk-regular text-ink-cream-muted">
          Your task dashboard lands here next.
        </Text>
      </View>

      <Pressable
        onPress={() => signOut()}
        className="btn btn--secondary-cream mx-6 mb-6"
      >
        <Text className="font-grotesk-bold text-base text-ink-cream">
          Sign out
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}
