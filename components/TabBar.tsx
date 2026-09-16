import { Feather } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedPressable } from "@/components/AnimatedPressable";
import { colors } from "@/constants/theme";
import { useTranslation } from "@/hooks/useTranslation";
import type { Translations } from "@/lib/i18n";
import { useTaskStore } from "@/store/useTaskStore";

// Derived from Tabs itself so this always matches whatever prop shape expo-router expects.
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

// "add" isn't a tab route — it's a top-level modal (see app/add.tsx) so it
// can slide up like a card instead of being limited to bottom-tabs' own
// fade/shift/none transitions. The Add button below is rendered as a fixed
// extra slot between the real tab routes, not one of them.
type TabRouteName = "index" | "tasks" | "ai-chat" | "settings";

const TAB_LABEL_KEYS: Record<TabRouteName, keyof Translations["tabs"]> = {
  index: "next",
  tasks: "tasks",
  "ai-chat": "inbox",
  settings: "settings",
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
      return <Feather name="zap" size={size} color={color} />;
    case "tasks":
      return <Feather name="clipboard" size={size} color={color} />;
    case "ai-chat":
      return <Feather name="message-circle" size={size} color={color} />;
    case "settings":
      return <Feather name="settings" size={size} color={color} />;
  }
}

function AddTabButton() {
  const router = useRouter();
  const t = useTranslation();

  return (
    <AnimatedPressable
      onPress={() => router.push("/add")}
      scaleTo={0.92}
      accessibilityRole="button"
      accessibilityLabel={t.tabs.addTask}
      className="items-center -mt-3"
    >
      <View
        style={Platform.select({
          ios: {
            shadowColor: colors.orange[600],
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.45,
            shadowRadius: 10,
          },
          android: { elevation: 6 },
        })}
        className="h-12 w-12 items-center justify-center rounded-full bg-orange-500"
      >
        <Feather name="plus" size={20} color={colors.ink.charcoal} />
      </View>
    </AnimatedPressable>
  );
}

function StandardTabButton({
  routeName,
  focused,
  onPress,
  edgeClassName,
}: {
  routeName: TabRouteName;
  focused: boolean;
  onPress: () => void;
  /** Extra padding nudging the icon away from the centered Add button. */
  edgeClassName?: string;
}) {
  const t = useTranslation();
  const tintColor = focused ? colors.orange[500] : colors.ink.charcoalMuted;
  const pendingTaskCount = useTaskStore((state) =>
    state.tasks.filter((task) => task.status === "pending").length,
  );

  return (
    <AnimatedPressable
      onPress={onPress}
      scaleTo={0.88}
      accessibilityRole="tab"
      accessibilityLabel={t.tabs[TAB_LABEL_KEYS[routeName]]}
      accessibilityState={{ selected: focused }}
      className={`flex-1 items-center justify-center ${edgeClassName ?? ""}`}
    >
      <View>
        <TabIcon routeName={routeName} color={tintColor} size={24} />
        {routeName === "tasks" && (
          <View className="absolute -right-3 -top-2 min-w-[18px] items-center rounded-full bg-orange-500 px-1">
            <Text className="font-grotesk-bold text-[10px] text-ink-charcoal">
              {pendingTaskCount}
            </Text>
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

// The floating Add button pokes up above the bar's own background (see its
// -mt-5 offset) via a negative margin, which overflows outside its parent's
// measured box without adding to it. React Navigation sizes each screen's
// bottom safe-content padding off that measured box, so without this reserve
// the poked-up button would visually overlap screen content sitting just
// above the tab bar (e.g. the AI chat input).
const BAR_HEIGHT = 52;
const FAB_RESERVE = 14;

export function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

  const renderRoute = (route: TabBarProps["state"]["routes"][number], index: number, edgeClassName?: string) => {
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

    return (
      <StandardTabButton
        key={route.key}
        routeName={routeName}
        focused={focused}
        onPress={onPress}
        edgeClassName={edgeClassName}
      />
    );
  };

  // The two routes flanking the centered Add button (tasks, ai-chat) sit
  // right up against it — nudge each away from center so the spacing
  // across all five slots feels even instead of tasks/ai-chat reading as
  // crowded against the middle.
  const [first, second, third, fourth] = state.routes;

  // The reserve and the icon row share one uninterrupted charcoal fill and
  // one border — only at the very top of this outer box — so the whole
  // thing reads as a single tall bar with headroom for the poked-up Add
  // button, not two stacked bars. A border between the two zones (or a
  // fill that only covers one of them) is what makes it look like a
  // separate slab sitting above the "real" bar — that was the bug.
  return (
    <View
      className="border-t border-white/10 bg-charcoal-900"
      style={{ height: BAR_HEIGHT + FAB_RESERVE + insets.bottom }}
    >
      <View
        className="absolute inset-x-0 bottom-0 flex-row items-center px-4"
        style={{ height: BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }}
      >
        {renderRoute(first, 0)}
        {renderRoute(second, 1, "pr-3")}
        <AddTabButton />
        {renderRoute(third, 2, "pl-3")}
        {renderRoute(fourth, 3)}
      </View>
    </View>
  );
}
