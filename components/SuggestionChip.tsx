import { Feather } from "@expo/vector-icons";
import { Text } from "react-native";

import { AnimatedPressable } from "@/components/AnimatedPressable";
import { colors } from "@/constants/theme";

type SuggestionChipProps = {
  emoji: string;
  icon?: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  /** Stacked greeting suggestions stretch full-width; the quick-action bar stays compact. */
  fullWidth?: boolean;
};

export function SuggestionChip({ emoji, icon, label, onPress, fullWidth = false }: SuggestionChipProps) {
  return (
    <AnimatedPressable
      onPress={onPress}
      className={
        fullWidth
          ? "chip chip--idle flex-row items-center gap-2 self-stretch px-4 py-3"
          : "chip chip--idle flex-row items-center gap-1.5 px-3.5 py-2"
      }
    >
      {icon ? (
        <Feather name={icon} size={fullWidth ? 16 : 18} color={colors.orange[500]} />
      ) : (
        <Text className={fullWidth ? "text-sm" : "text-xs"}>{emoji}</Text>
      )}
      <Text
        numberOfLines={1}
        className={
          fullWidth
            ? "flex-1 font-grotesk-semibold text-sm text-ink-cream"
            : "font-grotesk-semibold text-xs text-ink-cream"
        }
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}
