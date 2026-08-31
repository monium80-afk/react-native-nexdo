import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";

import { colors } from "@/constants/theme";

type AuthTextFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secureEntry?: boolean;
  keyboardType?: "email-address" | "default";
  autoComplete?: TextInputProps["autoComplete"];
};

export function AuthTextField({
  label,
  value,
  onChangeText,
  secureEntry = false,
  keyboardType = "default",
  autoComplete,
}: AuthTextFieldProps) {
  const [hidden, setHidden] = useState(secureEntry);

  return (
    <View className="field gap-1">
      <Text className="eyebrow text-ink-cream-muted">{label}</Text>
      <View className="flex-row items-center">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect={false}
          className="flex-1 font-grotesk-medium text-base text-ink-cream"
        />
        {secureEntry ? (
          <Pressable onPress={() => setHidden((prev) => !prev)} hitSlop={8}>
            <Feather
              name={hidden ? "eye" : "eye-off"}
              size={18}
              color={colors.ink.creamMuted}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
