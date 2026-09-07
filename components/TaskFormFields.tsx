import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { CATEGORY_META } from "@/constants/categories";
import { colors } from "@/constants/theme";
import type { TaskCategory } from "@/types/task";

export type DeadlineValue = "today" | "tomorrow" | "friday" | "weekend" | "nextWeek" | "none";

export const CATEGORY_ROWS: TaskCategory[][] = [
  ["school", "work"],
  ["personal", "other"],
];

export const DURATION_OPTIONS: { label: string; minutes: number }[] = [
  { label: "15m", minutes: 15 },
  { label: "30m", minutes: 30 },
  { label: "45m", minutes: 45 },
  { label: "1h", minutes: 60 },
  { label: "1.5h", minutes: 90 },
  { label: "2h", minutes: 120 },
  { label: "3h+", minutes: 180 },
];

export const DEADLINE_OPTIONS: { label: string; value: DeadlineValue }[] = [
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" },
  { label: "This Friday", value: "friday" },
  { label: "This Weekend", value: "weekend" },
  { label: "Next Week", value: "nextWeek" },
  { label: "No deadline", value: "none" },
];

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
      date.setDate(date.getDate() + ((5 - date.getDay() + 7) % 7));
      date.setHours(18, 0, 0, 0);
      return date;
    }
    case "weekend": {
      const date = new Date(now);
      date.setDate(date.getDate() + ((6 - date.getDay() + 7) % 7));
      date.setHours(12, 0, 0, 0);
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
        <Pressable onPress={action.onPress} hitSlop={8}>
          <Text className="font-grotesk-semibold text-sm text-orange-500">{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function CategoryOption({
  category,
  selected,
  onPress,
}: {
  category: TaskCategory;
  selected: boolean;
  onPress: () => void;
}) {
  const meta = CATEGORY_META[category];
  const tint = colors.category[category];

  return (
    <Pressable
      onPress={onPress}
      className="flex-1 flex-row items-center gap-2.5 rounded-2xl border px-4 py-3.5"
      style={{
        borderColor: selected ? tint[500] : colors.cream[300],
        backgroundColor: selected ? tint[100] : colors.cream[50],
      }}
    >
      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.dotColor }} />
      <Text className="font-grotesk-semibold text-sm text-ink-cream">{meta.label}</Text>
    </Pressable>
  );
}

export function DurationChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={
        selected
          ? "rounded-full border border-orange-500 bg-orange-500 px-4 py-2.5"
          : "rounded-full border border-cream-300 bg-cream-50 px-4 py-2.5"
      }
    >
      <Text
        className={
          selected ? "font-grotesk-bold text-sm text-cream-50" : "font-grotesk-medium text-sm text-ink-cream"
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function DeadlineChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={
        selected
          ? "rounded-full border border-charcoal-900 bg-charcoal-900 px-4 py-2.5"
          : "rounded-full border border-cream-300 bg-cream-50 px-4 py-2.5"
      }
    >
      <Text
        className={
          selected ? "font-grotesk-bold text-sm text-ink-charcoal" : "font-grotesk-medium text-sm text-ink-cream"
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function PriorityCard({
  title,
  subtitle,
  selected,
  onPress,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={
        selected
          ? "flex-1 gap-1 rounded-2xl border border-orange-500 bg-orange-100 p-3.5"
          : "flex-1 gap-1 rounded-2xl border border-cream-300 bg-cream-100 p-3.5"
      }
    >
      <Text
        className={
          selected ? "font-grotesk-bold text-sm text-orange-600" : "font-grotesk-bold text-sm text-ink-cream"
        }
      >
        {title}
      </Text>
      <Text
        className={
          selected
            ? "font-grotesk-medium text-xs text-orange-600"
            : "font-grotesk-medium text-xs text-ink-cream-muted"
        }
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}
