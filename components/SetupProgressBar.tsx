import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type SetupProgressBarProps = {
  percent: number;
};

export function SetupProgressBar({ percent }: SetupProgressBarProps) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(percent, {
      duration: 350,
      easing: Easing.out(Easing.cubic),
    });
  }, [percent, width]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View className="flex-row items-center pt-2">
      <View className="mr-4 h-2 flex-1 rounded-full bg-cream-200">
        <Animated.View
          className="h-full rounded-full bg-orange-500"
          style={fillStyle}
        />
      </View>
      <Text className="eyebrow text-ink-cream-muted">{percent}% SETUP</Text>
    </View>
  );
}
