import { Feather } from "@expo/vector-icons";
import { Modal, Pressable, Text } from "react-native";

import { colors } from "@/constants/theme";

type FilterOption<T extends string> = { label: string; value: T };

type FilterSheetProps<T extends string> = {
  visible: boolean;
  title: string;
  options: FilterOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  onClose: () => void;
};

export function FilterSheet<T extends string>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: FilterSheetProps<T>) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="scrim flex-1 justify-end" onPress={onClose}>
        <Pressable onPress={() => {}} className="card--cream-elevated gap-1 rounded-t-2xl p-6 pb-10">
          <Text className="eyebrow mb-3 text-ink-cream-muted">{title}</Text>
          {options.map((option) => {
            const isSelected = option.value === selected;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
                className="flex-row items-center justify-between rounded-2xl px-2 py-3.5"
              >
                <Text
                  className={
                    isSelected
                      ? "font-grotesk-semibold text-base text-orange-500"
                      : "font-grotesk-medium text-base text-ink-cream"
                  }
                >
                  {option.label}
                </Text>
                {isSelected ? <Feather name="check" size={18} color={colors.orange[500]} /> : null}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
