import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";

const TASK_BADGE_COUNT = 42;

type TabRouteName = "index" | "tasks" | "add" | "ai-chat" | "settings";

const TAB_LABELS: Record<TabRouteName, string> = {
  index: "Next",
  tasks: "Tasks",
  add: "Add",
  "ai-chat": "AI Chat",
  settings: "Settings",
};

function TabIcon({
  routeName,
  color,
  size,
}: {
  routeName: TabRouteName;
  color: string;
  size: number;
}) {
  switch (routeName) {
    case "index":
      return <Feather name="home" size={size} color={color} />;
    case "tasks":
      return <Feather name="clipboard" size={size} color={color} />;
    case "add":
      return <Feather name="plus" size={size} color={color} />;
    case "ai-chat":
      return <MaterialCommunityIcons name="robot-outline" size={size} color={color} />;
    case "settings":
      return <Feather name="settings" size={size} color={color} />;
  }
}

function AddTabButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="items-center -mt-[30px]">
      <View
        style={Platform.select({
          ios: {
            shadowColor: colors.orange[600],
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.45,
            shadowRadius: 12,
          },
          android: { elevation: 8 },
        })}
        className="h-16 w-16 items-center justify-center rounded-full bg-orange-500"
      >
        <TabIcon routeName="add" color={colors.ink.charcoal} size={28} />
      </View>
      <Text className="mt-2 font-grotesk-medium text-xs text-ink-charcoal-muted">Add</Text>
    </Pressable>
  );
}

function StandardTabButton({
  routeName,
  focused,
  onPress,
}: {
  routeName: Exclude<TabRouteName, "add">;
  focused: boolean;
  onPress: () => void;
}) {
  const tintColor = focused ? colors.orange[500] : colors.ink.charcoalMuted;

  return (
    <Pressable onPress={onPress} className="flex-1 items-center gap-1">
      <View>
        <TabIcon routeName={routeName} color={tintColor} size={24} />
        {routeName === "tasks" && (
          <View className="absolute -right-3 -top-2 min-w-[18px] items-center rounded-full bg-orange-500 px-1">
            <Text className="font-grotesk-bold text-[10px] text-ink-charcoal">
              {TASK_BADGE_COUNT}
            </Text>
          </View>
        )}
      </View>
      <Text
        className={
          focused
            ? "font-grotesk-semibold text-xs text-orange-500"
            : "font-grotesk-medium text-xs text-ink-charcoal-muted"
        }
      >
        {TAB_LABELS[routeName]}
      </Text>
    </Pressable>
  );
}

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-end border-t border-white/10 bg-charcoal-900 px-4 pt-3"
      style={{ paddingBottom: insets.bottom + 10 }}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const routeName = route.name as TabRouteName;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (routeName === "add") {
          return <AddTabButton key={route.key} onPress={onPress} />;
        }

        return (
          <StandardTabButton
            key={route.key}
            routeName={routeName}
            focused={focused}
            onPress={onPress}
          />
        );
      })}
    </View>
  );
}
