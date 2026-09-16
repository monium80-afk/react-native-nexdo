import { Feather, Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { AnimatedPressable } from "@/components/AnimatedPressable";
import { CATEGORY_COLOR_OPTIONS, getCategoryTint, isBuiltInCategoryId } from "@/constants/categories";
import { colors } from "@/constants/theme";
import { useCategoryStore } from "@/store/useCategoryStore";
import { useTaskStore } from "@/store/useTaskStore";
import type { Category, CategoryColor } from "@/types/category";

const SWATCH_ROW_SIZE = 4;

/** Name + color picker, shared by "Add New Category" and editing an existing row. */
function CategoryForm({
  initialLabel = "",
  initialColor,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialLabel?: string;
  initialColor: CategoryColor;
  submitLabel: string;
  /** Returns an error message to show, or null once the change is saved. */
  onSubmit: (label: string, color: CategoryColor) => string | null;
  onCancel?: () => void;
}) {
  const [label, setLabel] = useState(initialLabel);
  const [color, setColor] = useState<CategoryColor>(initialColor);
  const [error, setError] = useState<string | null>(null);

  const swatchRows: (typeof CATEGORY_COLOR_OPTIONS)[] = [];
  for (let i = 0; i < CATEGORY_COLOR_OPTIONS.length; i += SWATCH_ROW_SIZE) {
    swatchRows.push(CATEGORY_COLOR_OPTIONS.slice(i, i + SWATCH_ROW_SIZE));
  }

  const handleSubmit = () => {
    const message = onSubmit(label, color);
    setError(message);
    if (!message && !onCancel) setLabel("");
  };

  return (
    <View className="gap-4">
      <TextInput
        value={label}
        onChangeText={(text) => {
          setLabel(text);
          setError(null);
        }}
        placeholder="e.g. Fitness, Health, Client Work, Side Projects"
        placeholderTextColor={colors.ink.creamSubtle}
        maxLength={24}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
        className="rounded-2xl border border-cream-300 bg-cream-50 px-4 py-3.5 font-grotesk-regular text-base text-ink-cream"
      />

      <View className="gap-3">
        <Text className="font-grotesk-semibold text-[15px] text-ink-cream-muted">Color Theme</Text>
        {swatchRows.map((row) => (
          <View key={row[0].value} className="flex-row gap-2">
            {row.map((option) => {
              const selected = color === option.value;
              return (
                <AnimatedPressable
                  key={option.value}
                  onPress={() => setColor(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={option.label}
                  className={
                    selected
                      ? "flex-1 flex-row items-center gap-1.5 rounded-full border-2 border-charcoal-900 bg-cream-50 px-2.5 py-2"
                      : "flex-1 flex-row items-center gap-1.5 rounded-full border-2 border-cream-300 bg-cream-50 px-2.5 py-2"
                  }
                >
                  <View
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: getCategoryTint(option.value)[500] }}
                  />
                  <Text numberOfLines={1} className="flex-1 font-grotesk-medium text-sm text-ink-cream">
                    {option.label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>
        ))}
      </View>

      {error ? <Text className="font-grotesk-medium text-sm text-overdue-500">{error}</Text> : null}

      <View className="flex-row items-center justify-end gap-4">
        {onCancel ? (
          <AnimatedPressable onPress={onCancel} hitSlop={8} accessibilityRole="button" className="px-2 py-3">
            <Text className="font-grotesk-semibold text-[15px] text-ink-cream-muted">Cancel</Text>
          </AnimatedPressable>
        ) : null}
        <AnimatedPressable
          onPress={handleSubmit}
          accessibilityRole="button"
          className={onCancel ? "btn btn--primary flex-row gap-2 px-5 py-3" : "btn btn--primary flex-1 flex-row gap-2 py-3.5"}
        >
          <Feather name={onCancel ? "check" : "plus"} size={17} color={colors.cream[50]} />
          <Text className="font-grotesk-bold text-[15px] text-cream-50">{submitLabel}</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

/** Settings → Task categories: rename, recolor, star a default, add, delete, reset. */
export function ManageCategoriesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const categories = useCategoryStore((state) => state.categories);
  const defaultCategoryId = useCategoryStore((state) => state.defaultCategoryId);
  const addCategory = useCategoryStore((state) => state.addCategory);
  const updateCategory = useCategoryStore((state) => state.updateCategory);
  const deleteCategory = useCategoryStore((state) => state.deleteCategory);
  const setDefaultCategory = useCategoryStore((state) => state.setDefaultCategory);
  const resetDefaults = useCategoryStore((state) => state.resetDefaults);
  const tasks = useTaskStore((state) => state.tasks);

  const [editingId, setEditingId] = useState<string | null>(null);
  // Remounts the add form after a successful add so it starts fresh.
  const [addFormKey, setAddFormKey] = useState(0);

  const activeCount = (categoryId: string) =>
    tasks.filter((task) => task.category === categoryId && task.status === "pending").length;

  const validate = (label: string, exceptId?: string): string | null => {
    const trimmed = label.trim();
    if (!trimmed) return "Give the category a name.";
    const duplicate = categories.some(
      (category) => category.id !== exceptId && category.label.toLowerCase() === trimmed.toLowerCase(),
    );
    return duplicate ? `You already have a category called "${trimmed}".` : null;
  };

  const handleAdd = (label: string, color: CategoryColor) => {
    const error = validate(label);
    if (error) return error;
    addCategory(label, color);
    setAddFormKey((key) => key + 1);
    return null;
  };

  const handleUpdate = (id: string, label: string, color: CategoryColor) => {
    const error = validate(label, id);
    if (error) return error;
    updateCategory(id, { label, color });
    setEditingId(null);
    return null;
  };

  const handleDelete = (category: Category) => {
    const taskCount = tasks.filter((task) => task.category === category.id).length;
    Alert.alert(
      `Delete "${category.label}"?`,
      taskCount > 0
        ? `${taskCount} ${taskCount === 1 ? "task" : "tasks"} in it will move to Other.`
        : "No tasks use this category.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteCategory(category.id) },
      ],
    );
  };

  const handleReset = () => {
    Alert.alert(
      "Reset categories?",
      "This restores School, Work, Personal and Other with their original names and colors. Tasks in categories you created move to Other.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            resetDefaults();
            setEditingId(null);
          },
        },
      ],
    );
  };

  const usedColors = categories.map((category) => category.color);
  const suggestedColor = CATEGORY_COLOR_OPTIONS.find((option) => !usedColors.includes(option.value))?.value ?? "terracotta";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="scrim flex-1 justify-center px-4 py-10" onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable
            onPress={() => {}}
            className="overflow-hidden rounded-3xl border border-cream-300 bg-cream-50"
            style={{ maxHeight: "100%" }}
          >
          <View className="flex-row items-start gap-4 px-6 pt-7">
            <View className="flex-1 gap-1.5">
              <Text className="font-grotesk-bold text-[26px] leading-tight tracking-tight text-ink-cream">
                Manage Categories
              </Text>
              <Text className="font-grotesk-regular text-base text-ink-cream-muted">
                Customize categories and colors for your tasks
              </Text>
            </View>
            <AnimatedPressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="pt-2"
            >
              <Feather name="x" size={24} color={colors.ink.creamMuted} />
            </AnimatedPressable>
          </View>
          <View className="mx-6 mt-5 h-px bg-cream-300" />

          <ScrollView
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="flex-row items-center justify-between gap-3">
              <Text className="font-grotesk-bold text-[15px] tracking-[0.04em] text-ink-cream">
                ACTIVE CATEGORIES ({categories.length})
              </Text>
              <AnimatedPressable onPress={handleReset} hitSlop={8} accessibilityRole="button">
                <Text className="font-grotesk-medium text-[15px] text-ink-cream-muted underline">Reset defaults</Text>
              </AnimatedPressable>
            </View>

            <View className="mt-4 gap-3">
              {categories.map((category) => {
                const tint = getCategoryTint(category.color);
                const isDefault = category.id === defaultCategoryId;
                const canDelete = categories.length > 1 && !isBuiltInCategoryId(category.id);

                if (editingId === category.id) {
                  return (
                    <View key={category.id} className="rounded-2xl border border-cream-300 bg-cream-100 p-4">
                      <CategoryForm
                        initialLabel={category.label}
                        initialColor={category.color}
                        submitLabel="Save"
                        onSubmit={(label, color) => handleUpdate(category.id, label, color)}
                        onCancel={() => setEditingId(null)}
                      />
                    </View>
                  );
                }

                return (
                  <View
                    key={category.id}
                    className="flex-row items-center gap-3 rounded-2xl border border-cream-300 bg-cream-100 py-3.5 pl-3.5 pr-2"
                  >
                    <View
                      className="shrink flex-row items-center gap-2 rounded-full border px-3.5 py-2"
                      style={{ backgroundColor: tint[100], borderColor: `${tint[500]}59` }}
                    >
                      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tint[500] }} />
                      <Text numberOfLines={1} className="shrink font-grotesk-semibold text-base text-ink-cream">
                        {category.label}
                      </Text>
                    </View>

                    <View className="flex-1 items-start gap-1">
                      <Text numberOfLines={1} className="font-grotesk-regular text-[15px] text-ink-cream-muted">
                        {activeCount(category.id)} active
                      </Text>
                      {isDefault ? (
                        <View className="rounded-md bg-orange-100 px-2 py-0.5">
                          <Text className="font-grotesk-semibold text-xs text-orange-600">Default</Text>
                        </View>
                      ) : null}
                    </View>

                    <View className="flex-row items-center">
                      <AnimatedPressable
                        onPress={() => setDefaultCategory(category.id)}
                        accessibilityRole="button"
                        accessibilityLabel={isDefault ? `${category.label} is the default` : `Make ${category.label} the default`}
                        className={
                          isDefault
                            ? "h-9 w-9 items-center justify-center rounded-lg bg-orange-100"
                            : "h-9 w-9 items-center justify-center rounded-lg"
                        }
                      >
                        {isDefault ? (
                          <Ionicons name="star" size={20} color={colors.orange[500]} />
                        ) : (
                          <Feather name="star" size={19} color={colors.ink.creamMuted} />
                        )}
                      </AnimatedPressable>
                      <AnimatedPressable
                        onPress={() => setEditingId(category.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${category.label}`}
                        className="h-9 w-9 items-center justify-center"
                      >
                        <Feather name="edit-2" size={19} color={colors.ink.creamMuted} />
                      </AnimatedPressable>
                      <AnimatedPressable
                        onPress={() => handleDelete(category)}
                        disabled={!canDelete}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${category.label}`}
                        className="h-9 w-9 items-center justify-center"
                        style={canDelete ? undefined : { opacity: 0.35 }}
                      >
                        <Feather name="trash-2" size={19} color={colors.ink.creamMuted} />
                      </AnimatedPressable>
                    </View>
                  </View>
                );
              })}
            </View>

            <View className="mt-6 gap-4 rounded-2xl border border-cream-300 bg-cream-200/60 p-5">
              <View className="flex-row items-center gap-2.5">
                <Feather name="plus" size={20} color={colors.orange[500]} />
                <Text className="font-grotesk-semibold text-[17px] text-ink-cream">Add New Category</Text>
              </View>
              <CategoryForm
                key={addFormKey}
                initialColor={suggestedColor}
                submitLabel="Add Category"
                onSubmit={handleAdd}
              />
            </View>
          </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
