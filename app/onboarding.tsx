import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedPressable } from "@/components/AnimatedPressable";
import { GemLogo } from "@/components/GemLogo";
import { SetupProgressBar } from "@/components/SetupProgressBar";
import { colors } from "@/constants/theme";
import { useScreenEnterAnimation } from "@/hooks/useScreenEnterAnimation";
import { useTranslation } from "@/hooks/useTranslation";
import { posthog } from "@/lib/posthog";

// Positions only — the note labels come from onboarding.stickyNotes, in the same order.
const STICKY_NOTES = [
  { style: { top: 0, left: -6 }, rotate: "-7deg" },
  { style: { top: 0, right: -10 }, rotate: "4deg" },
  { style: { bottom: 0, left: -8 }, rotate: "3deg" },
  { style: { bottom: 0, right: -4 }, rotate: "-5deg" },
] as const;

export default function Onboarding() {
  const t = useTranslation();
  const router = useRouter();
  const enterStyle = useScreenEnterAnimation();
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect href="/" />;

  const handleGetStarted = () => {
    posthog.capture('onboarding_get_started_tapped')
    router.push('/(auth)/sign-up')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream[100] }}>
      <Animated.View style={enterStyle} className="flex-1 px-6 pb-6">
        <SetupProgressBar percent={0} />

        <View className="flex-1 items-center justify-center gap-7">
          <View
            className="bg-cream-50 border border-cream-300 h-16 w-16 items-center justify-center rounded-[16px]"
            style={[{ borderCurve: "continuous" }, styles.logoShadow]}
          >
            <GemLogo size={40} />
          </View>

          <View className="gap-4">
            <Text className="text-center text-[34px] font-grotesk-bold leading-[1.02] tracking-tight text-ink-cream">
              {t.onboarding.headline}
            </Text>
            <Text className="px-2 text-center text-[16px] font-grotesk-regular leading-relaxed text-ink-cream-muted">
              {t.onboarding.body}
            </Text>
          </View>

          <View className="relative mt-2 w-[84%] pb-[26px] pt-[26px]">
            {STICKY_NOTES.map((note, index) => (
              <View
                key={index}
                className="absolute rounded-full bg-cream-200 px-4 py-2"
                style={{
                  ...note.style,
                  transform: [{ rotate: note.rotate }],
                }}
              >
                <Text className="text-xs font-grotesk-regular text-ink-cream-muted">
                  {t.onboarding.stickyNotes[index]}
                </Text>
              </View>
            ))}

            <View
              className="card--charcoal gap-2 rounded-2xl p-5"
              style={styles.cardGlow}
            >
              <View className="badge bg-orange-500">
                <Text className="text-xs font-grotesk-bold tracking-wide text-cream-50">
                  {t.onboarding.nextUp}
                </Text>
              </View>

              <Text className="font-grotesk-bold text-base text-ink-charcoal">
                {t.onboarding.sampleTask}
              </Text>

              <View className="flex-row items-center gap-2">
                <Feather name="calendar" size={12} color={colors.orange[500]} />
                <Text className="font-grotesk-medium text-xs text-orange-500">
                  {t.onboarding.dueTomorrow}
                </Text>
                <Text className="text-xs text-ink-charcoal-muted">·</Text>
                <Feather name="clock" size={12} color={colors.ink.charcoalMuted} />
                <Text className="font-grotesk-regular text-xs text-ink-charcoal-muted">
                  ~45m
                </Text>
              </View>

              <View className="h-1.5 overflow-hidden rounded-full bg-charcoal-600">
                <View className="h-full w-[65%] rounded-full bg-orange-500" />
              </View>
            </View>
          </View>
        </View>

        <AnimatedPressable
          onPress={handleGetStarted}
          scaleTo={0.98}
          className="btn btn--primary flex-row items-center justify-center gap-2"
        >
          <Text className="font-grotesk-bold text-lg text-cream-50">
            {t.onboarding.getStarted}
          </Text>
          <Feather name="chevron-right" size={20} color={colors.cream[50]} />
        </AnimatedPressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  logoShadow: Platform.select({
    ios: {
      shadowColor: colors.ink.cream,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: {
      shadowColor: colors.ink.cream,
      elevation: 3,
    },
    default: {},
  }),
  cardGlow: Platform.select({
    ios: {
      shadowColor: colors.orange[500],
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 28,
    },
    android: {
      shadowColor: colors.orange[500],
      elevation: 20,
    },
    default: {},
  }),
});
