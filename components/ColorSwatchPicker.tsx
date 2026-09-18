import { Feather } from "@expo/vector-icons";
import { View } from "react-native";

import { AnimatedPressable } from "@/components/AnimatedPressable";
import { CATEGORY_COLOR_OPTIONS, getCategoryTint } from "@/constants/categories";
import { colors } from "@/constants/theme";
import { useTranslation } from "@/hooks/useTranslation";
import type { CategoryColor } from "@/types/category";

/** A row of color dots — the selected one gets a ring and a check mark. */
export function ColorSwatchPicker({
  selected,
  onSelect,
}: {
  selected: CategoryColor;
  onSelect: (color: CategoryColor) => void;
}) {
  const t = useTranslation();

  return (
    <View className="flex-row flex-wrap gap-3">
      {CATEGORY_COLOR_OPTIONS.map((option) => {
        const isSelected = selected === option.value;
        return (
          <AnimatedPressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            scaleTo={0.9}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={t.categories.colors[option.value]}
            className={
              isSelected
                ? "h-11 w-11 items-center justify-center rounded-full border-2 border-charcoal-900"
                : "h-11 w-11 items-center justify-center rounded-full border-2 border-transparent"
            }
          >
            <View
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: getCategoryTint(option.value)[500] }}
            >
              {isSelected ? <Feather name="check" size={16} color={colors.cream[50]} /> : null}
            </View>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}
