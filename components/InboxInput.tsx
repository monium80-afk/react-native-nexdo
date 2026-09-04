import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import { colors } from "@/constants/theme";

export type AttachmentKind = "photo" | "voice" | "document";

type InboxInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttachment: (kind: AttachmentKind, label: string) => void;
};

function formatDurationLabel(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function InboxInput({ value, onChangeText, onSend, onAttachment }: InboxInputProps) {
  // Recording state (isRecording, durationMillis) is polled by this hook, not stored locally —
  // the recorder instance itself is the source of truth.
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 250);
  const isRecording = recorderState.isRecording;
  const canSend = value.trim().length > 0;

  const handleMicPress = async () => {
    if (isRecording) {
      const seconds = Math.max(1, Math.round(recorderState.durationMillis / 1000));
      await audioRecorder.stop();
      onAttachment("voice", `Voice note (${formatDurationLabel(seconds)})`);
      return;
    }

    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Microphone access needed",
        "Nexdo needs microphone access to record voice notes. You can enable it in Settings.",
      );
      return;
    }

    await setAudioModeAsync({ allowsRecording: true });
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
  };

  const handleCameraPress = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Camera access needed",
        "Nexdo needs camera access to capture photos. You can enable it in Settings.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.6 });
    if (result.canceled) return;
    onAttachment("photo", "Photo attached");
  };

  const handleAttachPress = async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: false });
    if (result.canceled) return;
    onAttachment("document", result.assets[0].name);
  };

  return (
    <View className="flex-row items-end gap-1 rounded-full border border-cream-300 bg-cream-50 py-1.5 pl-2.5 pr-1.5">
      <Pressable onPress={handleMicPress} hitSlop={8} className="h-9 w-9 items-center justify-center">
        <Feather name="mic" size={19} color={isRecording ? colors.overdue[500] : colors.ink.creamMuted} />
      </Pressable>
      <Pressable
        onPress={handleCameraPress}
        disabled={isRecording}
        hitSlop={8}
        style={{ opacity: isRecording ? 0.35 : 1 }}
        className="h-9 w-9 items-center justify-center"
      >
        <Feather name="camera" size={19} color={colors.ink.creamMuted} />
      </Pressable>
      <Pressable
        onPress={handleAttachPress}
        disabled={isRecording}
        hitSlop={8}
        style={{ opacity: isRecording ? 0.35 : 1 }}
        className="h-9 w-9 items-center justify-center"
      >
        <Feather name="paperclip" size={19} color={colors.ink.creamMuted} />
      </Pressable>

      {isRecording ? (
        <View className="flex-1 flex-row items-center gap-2 py-2.5">
          <View className="h-2 w-2 rounded-full bg-overdue-500" />
          <Text className="font-grotesk-medium text-sm text-ink-cream">
            Recording… {formatDurationLabel(Math.round(recorderState.durationMillis / 1000))}
          </Text>
        </View>
      ) : (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Type, speak, or take a picture..."
          placeholderTextColor={colors.ink.creamMuted}
          multiline
          style={{ textAlignVertical: "center", maxHeight: 100, paddingVertical: 8 }}
          className="flex-1 font-grotesk-regular text-sm text-ink-cream"
        />
      )}

      <Pressable
        onPress={isRecording ? handleMicPress : onSend}
        disabled={!isRecording && !canSend}
        hitSlop={4}
        className="h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: isRecording || canSend ? colors.orange[500] : colors.cream[200] }}
      >
        <Feather
          name={isRecording ? "square" : "send"}
          size={isRecording ? 15 : 17}
          color={isRecording || canSend ? colors.cream[50] : colors.ink.creamMuted}
        />
      </Pressable>
    </View>
  );
}
