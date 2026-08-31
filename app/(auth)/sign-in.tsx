import { useSignIn } from "@clerk/expo";
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
import { SocialAuthButton } from "@/components/SocialAuthButton";
import { VerificationModal } from "@/components/VerificationModal";
import { colors } from "@/constants/theme";
import { useScreenEnterAnimation } from "@/hooks/useScreenEnterAnimation";

const REVEAL_LAYOUT = LinearTransition.duration(250);

export default function SignIn() {
  const router = useRouter();
  const enterStyle = useScreenEnterAnimation();
  const { signIn, errors, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  const handleSocialAuth = async (provider: "google" | "apple") => {
    try {
      const { createdSessionId } = await startSSOFlow({
        strategy: provider === "google" ? "oauth_google" : "oauth_apple",
      });
      if (createdSessionId) router.replace("/");
    } catch (err) {
      console.error("Social sign-in error:", JSON.stringify(err, null, 2));
    }
  };

  const handleLogIn = async () => {
    if (!email) return;
    const { error } = await signIn.emailCode.sendCode({ emailAddress: email });
    if (!error) setModalVisible(true);
  };

  const handleVerifyCode = async (code: string) => {
    const { error } = await signIn.emailCode.verifyCode({ code });
    if (error) return error.longMessage ?? "Invalid code. Try again.";

    if (signIn.status === "complete") {
      await signIn.finalize({ navigate: () => router.replace("/") });
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
            <View className="mt-16 gap-3">
              <Text className="text-title text-ink-cream">Welcome back.</Text>
              <Text className="text-base font-grotesk-regular leading-relaxed text-ink-cream-muted">
                Log in to pick up right where you left off.
              </Text>
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
                  {errors.fields.identifier ? (
                    <Text className="text-sm font-grotesk-medium text-overdue-500">
                      {errors.fields.identifier.message}
                    </Text>
                  ) : null}
                  <Pressable
                    onPress={handleLogIn}
                    disabled={fetchStatus === "fetching"}
                    className="btn btn--primary mt-1"
                    style={({ pressed }) => [
                      pressed ? { transform: [{ scale: 0.99 }] } : undefined,
                      fetchStatus === "fetching" ? { opacity: 0.6 } : undefined,
                    ]}
                  >
                    <Text className="font-grotesk-bold text-lg text-cream-50">
                      Log in
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
                Don&apos;t have an account?
              </Text>
              <Pressable onPress={() => router.push("/(auth)/sign-up")}>
                <Text className="font-grotesk-bold text-sm text-orange-500">
                  Sign up
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
