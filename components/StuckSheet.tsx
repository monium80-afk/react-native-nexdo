import { Feather, Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";

import { AnimatedPressable } from "@/components/AnimatedPressable";
import { colors } from "@/constants/theme";

// Short, specific reasons — they're stored on the task's skip record, so
// vague ones ("later") would make the suppression impossible to explain back
// to the user when the task resurfaces.
export const STUCK_REASONS = [
  { label: "It's too big to start", icon: "layers" },
  { label: "I'm missing something I need", icon: "help-circle" },
  { label: "I can't focus on it right now", icon: "cloud-drizzle" },
] as const satisfies readonly { label: string; icon: keyof typeof Feather.glyphMap }[];

export function StuckSheet({
  visible,
  taskTitle,
  onPickReason,
  onAskAi,
  onClose,
}: {
  visible: boolean;
  taskTitle: string;
  /** Skips the task for a few hours and moves the session on to the next one. */
  onPickReason: (reason: string) => void;
  onAskAi: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="scrim flex-1 justify-end" onPress={onClose}>
        <Pressable onPress={() => {}} className="card--cream-elevated gap-1 rounded-t-2xl p-6 pb-10">
          <Text className="eyebrow text-ink-cream-muted">WHAT&apos;S IN THE WAY?</Text>
          <Text numberOfLines={1} className="pb-2 font-grotesk-medium text-sm text-ink-cream-muted">
            {taskTitle}
          </Text>

          {STUCK_REASONS.map((reason) => (
            <AnimatedPressable
              key={reason.label}
              onPress={() => onPickReason(reason.label)}
              className="flex-row items-center gap-3 rounded-2xl px-2 py-3.5"
            >
              <View className="h-8 w-8 items-center justify-center rounded-full bg-cream-200">
                <Feather name={reason.icon} size={15} color={colors.ink.cream} />
              </View>
              <Text className="flex-1 font-grotesk-semibold text-sm text-ink-cream">{reason.label}</Text>
              <Feather name="chevron-right" size={16} color={colors.ink.creamMuted} />
            </AnimatedPressable>
          ))}

          <Text className="pt-2 font-grotesk-regular text-xs text-ink-cream-subtle">
            We&apos;ll park it for a few hours and move you to the next task.
          </Text>

          <AnimatedPressable onPress={onAskAi} className="btn btn--primary mt-4 gap-2">
            <Ionicons name="bulb-outline" size={16} color={colors.cream[50]} />
            <Text className="font-grotesk-bold text-base text-cream-50">Talk it through with AI</Text>
          </AnimatedPressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
