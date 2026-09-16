import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Text, View } from "react-native";

import { AnimatedPressable } from "@/components/AnimatedPressable";
import { ManageCategoriesSheet } from "@/components/ManageCategoriesSheet";
import { getCategoryTint } from "@/constants/categories";
import { colors } from "@/constants/theme";
import { useCategoryStore } from "@/store/useCategoryStore";

/** The "Task categories" row under Settings → Nexdo Preferences; opens Manage Categories. */
export function CategoryManager() {
  const categories = useCategoryStore((state) => state.categories);
  const [open, setOpen] = useState(false);

  return (
    <>
      <AnimatedPressable
        onPress={() => setOpen(true)}
        scaleTo={0.98}
        accessibilityRole="button"
        className="card card--charcoal flex-row items-center gap-3 p-4"
      >
        <View className="h-9 w-9 items-center justify-center rounded-full bg-white/10">
          <Feather name="tag" size={16} color={colors.orange[500]} />
        </View>
        <View className="flex-1 gap-1">
          <Text className="font-grotesk-semibold text-base text-ink-charcoal">Task categories</Text>
          <View className="flex-row items-center gap-2">
            <View className="flex-row gap-1">
              {categories.slice(0, 6).map((category) => (
                <View
                  key={category.id}
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: getCategoryTint(category.color)[500] }}
                />
              ))}
            </View>
            <Text className="font-grotesk-regular text-xs text-ink-charcoal-muted">
              {categories.length} {categories.length === 1 ? "category" : "categories"}
            </Text>
          </View>
        </View>
        <Feather name="chevron-right" size={18} color={colors.ink.charcoalMuted} />
      </AnimatedPressable>

      <ManageCategoriesSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
