import { useSignUp } from "@clerk/expo";
import { useSSO } from "@clerk/expo/experimental";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthTextField } from "@/components/AuthTextField";
import { SetupProgressBar } from "@/components/SetupProgressBar";
import { SocialAuthButton } from "@/components/SocialAuthButton";
import { VerificationModal } from "@/components/VerificationModal";
import { colors } from "@/constants/theme";
import { useScreenEnterAnimation } from "@/hooks/useScreenEnterAnimation";

const REVEAL_LAYOUT = LinearTransition.duration(250);

const PLANNED_TASKS = [
  { title: "Buy groceries", when: "Tonight", dotClassName: "bg-orange-500" },
  {
    title: "Finish math assignment",
    when: "Friday",
    dotClassName: "bg-orange-500/70",
  },
  { title: "Call dentist", when: "Tomorrow", dotClassName: "bg-orange-500/45" },
] as const;

export default function SignUp() {
  const router = useRouter();
  const enterStyle = useScreenEnterAnimation();
  const { signUp, errors, fetchStatus } = useSignUp();
  const { startSSOFlow } = useSSO();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  const handleSocialAuth = async (provider: "google" | "apple") => {
    try {
      const { createdSessionId } = await startSSOFlow({
        strategy: provider === "google" ? "oauth_google" : "oauth_apple",
      });
      if (createdSessionId) router.replace("/");
    } catch (err) {
      console.error("Social sign-up error:", JSON.stringify(err, null, 2));
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) return;
    const { error } = await signUp.password({ emailAddress: email, password });
    if (error) return;

    const { error: verificationError } = await signUp.verifications.sendEmailCode();
    if (verificationError) return;
    setModalVisible(true);
  };

  const handleVerifyCode = async (code: string) => {
    const { error } = await signUp.verifications.verifyEmailCode({ code });
    if (error) return error.longMessage ?? "Invalid code. Try again.";

    if (signUp.status === "complete") {
      const { error: finalizeError } = await signUp.finalize({
        navigate: () => router.replace("/"),
      });
      if (finalizeError) {
        return finalizeError.longMessage ?? "Invalid code. Try again.";
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream[100] }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={enterStyle}>
            <SetupProgressBar percent={94} />

            <View className="mt-8 gap-3">
              <Text className="text-title text-ink-cream">
                Don&apos;t lose your plan.
              </Text>
              <Text className="text-base font-grotesk-regular leading-relaxed text-ink-cream-muted">
                3 tasks are sorted and ready. Create an account to save them
                and keep going.
              </Text>
            </View>

            <View className="card card--cream mt-6 gap-5 p-5">
              {PLANNED_TASKS.map((task) => (
                <View key={task.title} className="flex-row items-center gap-3">
                  <View className={`h-2.5 w-2.5 rounded-full ${task.dotClassName}`} />
                  <Text className="flex-1 font-grotesk-bold text-base text-ink-cream">
                    {task.title}
                  </Text>
                  <Text className="font-grotesk-regular text-sm text-ink-cream-muted">
                    {task.when}
                  </Text>
                </View>
              ))}
            </View>

            <View className="mt-8 gap-3">
              <SocialAuthButton
                provider="google"
                onPress={() => handleSocialAuth("google")}
              />
              <SocialAuthButton
                provider="apple"
                onPress={() => handleSocialAuth("apple")}
              />
            </View>

            <Animated.View layout={REVEAL_LAYOUT} className="mt-5 gap-3">
              {showEmailForm ? (
                <Animated.View
                  entering={FadeIn.duration(220)}
                  exiting={FadeOut.duration(150)}
                  className="gap-3"
                >
                  <AuthTextField
                    label="EMAIL"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoComplete="email"
                  />
                  {errors.fields.emailAddress ? (
                    <Text className="text-sm font-grotesk-medium text-overdue-500">
                      {errors.fields.emailAddress.message}
                    </Text>
                  ) : null}
                  <AuthTextField
                    label="PASSWORD"
                    value={password}
                    onChangeText={setPassword}
                    secureEntry
                    autoComplete="new-password"
                  />
                  {errors.fields.password ? (
                    <Text className="text-sm font-grotesk-medium text-overdue-500">
                      {errors.fields.password.message}
                    </Text>
                  ) : null}
                  <View nativeID="clerk-captcha" />
                  <Pressable
                    onPress={handleSignUp}
                    disabled={fetchStatus === "fetching"}
                    className="btn btn--primary mt-1"
                    style={({ pressed }) => [
                      pressed ? { transform: [{ scale: 0.99 }] } : undefined,
                      fetchStatus === "fetching" ? { opacity: 0.6 } : undefined,
                    ]}
                  >
                    <Text className="font-grotesk-bold text-lg text-cream-50">
                      Sign Up
                    </Text>
                  </Pressable>
                </Animated.View>
              ) : (
                <Animated.View
                  entering={FadeIn.duration(220)}
                  exiting={FadeOut.duration(150)}
                >
                  <Pressable
                    onPress={() => setShowEmailForm(true)}
                    className="items-center"
                  >
                    <Text className="font-grotesk-semibold text-sm text-ink-cream-muted underline">
                      or continue with email
                    </Text>
                  </Pressable>
                </Animated.View>
              )}
            </Animated.View>

            <Animated.View
              layout={REVEAL_LAYOUT}
              className="mt-5 flex-row justify-center gap-1"
            >
              <Text className="font-grotesk-regular text-sm text-ink-cream-muted">
                I have an account already?
              </Text>
              <Pressable onPress={() => router.push("/(auth)/sign-in")}>
                <Text className="font-grotesk-bold text-sm text-orange-500">
                  Log in
                </Text>
              </Pressable>
            </Animated.View>
          </Animated.View>

          <Animated.View layout={REVEAL_LAYOUT} className="mt-10">
            <Text className="px-4 text-center font-grotesk-regular text-xs text-ink-cream-muted">
              By continuing you agree to Nexdo&apos;s Terms and Privacy
              Policy.
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <VerificationModal
        visible={modalVisible}
        email={email}
        onClose={() => setModalVisible(false)}
        onVerify={handleVerifyCode}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
});
