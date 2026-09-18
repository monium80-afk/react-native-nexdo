import { FontAwesome } from "@expo/vector-icons";
import { Text } from "react-native";

import { AnimatedPressable } from "@/components/AnimatedPressable";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { colors } from "@/constants/theme";
import { useTranslation } from "@/hooks/useTranslation";

type SocialAuthButtonProps = {
  provider: "google" | "apple";
  onPress?: () => void;
};

export function SocialAuthButton({ provider, onPress }: SocialAuthButtonProps) {
  const t = useTranslation();
  const isApple = provider === "apple";

  return (
    <AnimatedPressable
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
        {isApple ? t.auth.continueWithApple : t.auth.continueWithGoogle}
      </Text>
    </AnimatedPressable>
  );
}
