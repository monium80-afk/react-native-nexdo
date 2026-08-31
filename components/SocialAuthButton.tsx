import { FontAwesome } from "@expo/vector-icons";
import { Pressable, Text } from "react-native";

import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { colors } from "@/constants/theme";

type SocialAuthButtonProps = {
  provider: "google" | "apple";
  onPress?: () => void;
};

const COPY = {
  google: "Continue with Google",
  apple: "Continue with Apple",
} as const;

export function SocialAuthButton({ provider, onPress }: SocialAuthButtonProps) {
  const isApple = provider === "apple";

  return (
    <Pressable
      onPress={onPress}
      className={`btn flex-row items-center justify-center gap-3 ${
        isApple ? "btn--charcoal-solid" : "bg-cream-50 btn--secondary-cream"
      }`}
    >
      {isApple ? (
        <FontAwesome name="apple" size={20} color={colors.cream[50]} />
      ) : (
        <GoogleIcon size={18} />
      )}
      <Text
        className={`font-grotesk-bold text-base ${
          isApple ? "text-cream-50" : "text-ink-cream"
        }`}
      >
        {COPY[provider]}
      </Text>
    </Pressable>
  );
}
