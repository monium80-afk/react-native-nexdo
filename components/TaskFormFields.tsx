import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { AnimatedPressable } from "@/components/AnimatedPressable";
import { getCategoryTint } from "@/constants/categories";
import { colors } from "@/constants/theme";
import { useCategoryStore } from "@/store/useCategoryStore";
import type { Category } from "@/types/category";

export type DeadlineValue = "today" | "tomorrow" | "friday" | "weekend" | "nextWeek" | "none";

// Chip labels live in the translations: form.durationOptions / form.deadlines.
export const DURATION_OPTIONS: number[] = [15, 30, 45, 60, 90, 120, 180];

export const DEADLINE_OPTIONS: DeadlineValue[] = ["today", "tomorrow", "friday", "weekend", "nextWeek", "none"];

// "This Friday"/"This Weekend" resolve to the nearest upcoming Fri/Sat, today included.
export function computeDeadlineDate(value: DeadlineValue): Date | undefined {
  const now = new Date();

  switch (value) {
    case "today": {
      const date = new Date(now);
      date.setHours(18, 0, 0, 0);
      return date;
    }
    case "tomorrow": {
      const date = new Date(now);
      date.setDate(date.getDate() + 1);
      date.setHours(18, 0, 0, 0);
      return date;
    }
    case "friday": {
      const date = new Date(now);
      const daysUntilFriday = (5 - date.getDay() + 7) % 7;
      date.setDate(date.getDate() + daysUntilFriday);
      date.setHours(18, 0, 0, 0);
      if (daysUntilFriday === 0 && date.getTime() <= now.getTime()) date.setDate(date.getDate() + 7);
      return date;
    }
    case "weekend": {
      const date = new Date(now);
      const daysUntilSaturday = (6 - date.getDay() + 7) % 7;
      date.setDate(date.getDate() + daysUntilSaturday);
      date.setHours(12, 0, 0, 0);
      if (daysUntilSaturday === 0 && date.getTime() <= now.getTime()) date.setDate(date.getDate() + 7);
      return date;
    }
    case "nextWeek": {
      const date = new Date(now);
      date.setDate(date.getDate() + 7);
      date.setHours(18, 0, 0, 0);
      return date;
    }
    case "none":
    default:
      return undefined;
  }
}

export function parseCustomDeadline(text: string): Date | undefined {
  if (!text.trim()) return undefined;
  const date = new Date(text.trim().replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function SectionHeader({
  icon,
  label,
  action,
}: {
  icon: ReactNode;
  label: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        {icon}
        <Text className="eyebrow text-ink-cream">{label}</Text>
      </View>
      {action ? (
        <AnimatedPressable onPress={action.onPress} hitSlop={8}>
          <Text className="font-grotesk-semibold text-sm text-orange-500">{action.label}</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

export function CategoryOption({
  category,
  selected,
  onPress,
}: {
  category: Category;
  selected: boolean;
  onPress: () => void;
}) {
  const tint = getCategoryTint(category.color);

  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className="flex-1 flex-row items-center gap-2.5 rounded-2xl border px-4 py-3.5"
      style={{
        borderColor: selected ? tint[500] : colors.cream[300],
        backgroundColor: selected ? tint[100] : colors.cream[50],
      }}
    >
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tint[500] }} />
      <Text numberOfLines={1} className="flex-1 font-grotesk-semibold text-sm text-ink-cream">
        {category.label}
      </Text>
    </AnimatedPressable>
  );
}

/** Every category — built-in and the user's own from Settings — two to a row. */
export function CategoryPicker({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  const categories = useCategoryStore((state) => state.categories);

  const rows: Category[][] = [];
  for (let i = 0; i < categories.length; i += 2) rows.push(categories.slice(i, i + 2));

  return (
    <View className="gap-3">
      {rows.map((row) => (
        <View key={row.map((category) => category.id).join("-")} className="flex-row gap-3">
          {row.map((category) => (
            <CategoryOption
              key={category.id}
              category={category}
              selected={selectedId === category.id}
              onPress={() => onSelect(category.id)}
            />
          ))}
          {/* Keeps an odd one out at half width instead of stretching across the row. */}
          {row.length === 1 ? <View className="flex-1" /> : null}
        </View>
      ))}
    </View>
  );
}

export function DurationChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <AnimatedPressable
      onPress={onPress}
      className={
        selected
          ? "rounded-2xl border border-orange-500 bg-orange-500 px-3.5 py-2"
          : "rounded-2xl border border-cream-300 bg-cream-50 px-3.5 py-2"
      }
    >
      <Text
        className={
          selected ? "font-grotesk-bold text-sm text-cream-50" : "font-grotesk-medium text-sm text-ink-cream"
        }
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

export function DeadlineChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <AnimatedPressable
      onPress={onPress}
      className={
        selected
          ? "rounded-2xl border border-charcoal-900 bg-charcoal-900 px-3.5 py-2"
          : "rounded-2xl border border-cream-300 bg-cream-50 px-3.5 py-2"
      }
    >
      <Text
        className={
          selected ? "font-grotesk-bold text-sm text-ink-charcoal" : "font-grotesk-medium text-sm text-ink-cream"
        }
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

export function PriorityCard({ title, selected, onPress }: { title: string; selected: boolean; onPress: () => void }) {
  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className={
        selected
          ? "flex-1 rounded-2xl border border-orange-500 bg-orange-100 p-3.5"
          : "flex-1 rounded-2xl border border-cream-300 bg-cream-100 p-3.5"
      }
    >
      <Text
        className={
          selected ? "font-grotesk-bold text-sm text-orange-600" : "font-grotesk-bold text-sm text-ink-cream"
        }
      >
        {title}
      </Text>
    </AnimatedPressable>
  );
}
