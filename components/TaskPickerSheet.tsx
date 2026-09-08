import { Feather } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { CATEGORY_META } from "@/constants/categories";
import { colors } from "@/constants/theme";
import { formatDuration } from "@/lib/formatDuration";
import type { Task } from "@/types/task";

export function TaskPickerSheet({
  visible,
  tasks,
  selectedIds,
  onToggle,
  onUseRecommended,
  onClose,
}: {
  visible: boolean;
  tasks: Task[];
  selectedIds: string[];
  onToggle: (taskId: string) => void;
  onUseRecommended: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="scrim flex-1 justify-end" onPress={onClose}>
        <Pressable onPress={() => {}} className="card--cream-elevated max-h-[80%] gap-1 rounded-t-2xl p-6 pb-10">
          <View className="flex-row items-center justify-between pb-3">
            <Text className="eyebrow text-ink-cream-muted">PICK YOUR TASKS</Text>
            <Pressable onPress={onUseRecommended} hitSlop={8}>
              <Text className="font-grotesk-semibold text-sm text-orange-500">Use recommended</Text>
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {tasks.map((task) => {
              const category = CATEGORY_META[task.category];
              const selected = selectedIds.includes(task.id);
              return (
                <Pressable
                  key={task.id}
                  onPress={() => onToggle(task.id)}
                  className="flex-row items-center gap-3 rounded-2xl px-2 py-3.5"
                >
                  <View
                    className={
                      selected
                        ? "h-5 w-5 items-center justify-center rounded-md bg-orange-500"
                        : "h-5 w-5 rounded-md border-2 border-cream-300"
                    }
                  >
                    {selected ? <Feather name="check" size={12} color={colors.cream[50]} /> : null}
                  </View>
                  <View className="flex-1 gap-1">
                    <Text className="font-grotesk-semibold text-sm text-ink-cream">{task.title}</Text>
                    <Text className="font-grotesk-medium text-xs text-ink-cream-muted">{category.label}</Text>
                  </View>
                  <Text className="font-grotesk-medium text-xs text-ink-cream-muted">
                    {formatDuration(task.estimatedMinutes)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable onPress={onClose} className="btn btn--primary mt-3 flex-row gap-2">
            <Text className="font-grotesk-bold text-base text-cream-50">Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
