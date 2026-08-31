import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

const CODE_LENGTH = 6;

type VerificationModalProps = {
  visible: boolean;
  email: string;
  onClose: () => void;
};

export function VerificationModal({
  visible,
  email,
  onClose,
}: VerificationModalProps) {
  const [code, setCode] = useState("");
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();

  useEffect(() => {
    if (!visible) return;

    setCode("");
    const focusTimeout = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(focusTimeout);
  }, [visible]);

  const handleChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, "").slice(0, CODE_LENGTH);
    setCode(digitsOnly);

    if (digitsOnly.length === CODE_LENGTH) {
      Keyboard.dismiss();
      router.replace("/");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="scrim flex-1 justify-end">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View className="card--cream-elevated gap-5 rounded-t-3xl p-6 pb-10">
            <View className="items-center gap-2">
              <Text className="text-card-title text-center text-ink-cream">
                Check your email
              </Text>
              <Text className="text-body px-4 text-center text-ink-cream-muted">
                We sent a 6-digit code to{"\n"}
                <Text className="font-grotesk-semibold text-ink-cream">
                  {email}
                </Text>
              </Text>
            </View>

            <Pressable
              onPress={() => inputRef.current?.focus()}
              className="flex-row justify-center gap-2"
            >
              {Array.from({ length: CODE_LENGTH }).map((_, index) => (
                <View
                  key={index}
                  className={`h-14 w-11 items-center justify-center rounded-2xl border bg-cream-50 ${
                    index < code.length ? "border-orange-500" : "border-cream-300"
                  }`}
                >
                  <Text className="font-grotesk-bold text-xl text-ink-cream">
                    {code[index] ?? ""}
                  </Text>
                </View>
              ))}
            </Pressable>

            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={handleChange}
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              className="absolute h-px w-px opacity-0"
            />

            <Pressable onPress={onClose} className="items-center">
              <Text className="font-grotesk-semibold text-sm text-ink-cream-muted">
                Cancel
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
