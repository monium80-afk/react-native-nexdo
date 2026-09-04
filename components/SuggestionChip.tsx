import { Pressable, Text } from "react-native";

type SuggestionChipProps = {
  emoji: string;
  label: string;
  onPress: () => void;
  /** Stacked greeting suggestions stretch full-width; the quick-action bar stays compact. */
  fullWidth?: boolean;
};

export function SuggestionChip({ emoji, label, onPress, fullWidth = false }: SuggestionChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className={
        fullWidth
          ? "flex-row items-center gap-2.5 self-stretch rounded-full border border-cream-300 bg-cream-50 px-5 py-3.5"
          : "flex-row items-center gap-2 rounded-full border border-cream-300 bg-cream-50 px-4 py-2.5"
      }
    >
      <Text className={fullWidth ? "text-base" : "text-sm"}>{emoji}</Text>
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
    </Pressable>
  );
}
