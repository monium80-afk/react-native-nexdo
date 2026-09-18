import {
    RecordingPresets,
    requestRecordingPermissionsAsync,
    setAudioModeAsync,
    useAudioRecorder,
    useAudioRecorderState,
} from "expo-audio";
import { useState } from "react";
import { Alert, Platform } from "react-native";

import type { ExtractTextRequestBody, ExtractTextResponseBody } from "@/app/api/extract-text+api";
import { useTranslation } from "@/hooks/useTranslation";
import { readFileAsBase64 } from "@/lib/ai/media";
import { apiPost } from "@/lib/api";

/**
 * Tap once to start recording, tap again to stop — the recording is sent to
 * /api/extract-text and the transcript handed to `onTranscript`.
 */
export function useVoiceTranscription(onTranscript: (text: string) => void) {
  const t = useTranslation();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 250);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const isRecording = recorderState.isRecording;

  const transcribe = async (uri: string) => {
    setIsTranscribing(true);
    try {
      const request: ExtractTextRequestBody = {
        mimeType: Platform.OS === "web" ? "audio/webm" : "audio/mp4",
        base64: await readFileAsBase64(uri),
        kind: "voice",
      };
      const { text } = await apiPost<ExtractTextResponseBody>("/api/extract-text", request);
      const transcript = text.trim();
      if (transcript) onTranscript(transcript);
      else Alert.alert(t.chat.couldntCatch, t.chat.attachmentReplies.voice);
    } catch (error) {
      console.warn("[useVoiceTranscription] transcription failed", error);
      Alert.alert(t.chat.couldntTranscribe, t.chat.attachmentReplies.voice);
    } finally {
      setIsTranscribing(false);
    }
  };

  const toggleRecording = async () => {
    if (isTranscribing) return;

    try {
      if (isRecording) {
        await audioRecorder.stop();
        if (audioRecorder.uri) await transcribe(audioRecorder.uri);
        return;
      }

      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t.chat.micPermissionTitle, t.chat.micPermissionBody);
        return;
      }

      await setAudioModeAsync({ allowsRecording: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (error) {
      console.warn("[useVoiceTranscription] recording failed", error);
      try {
        if (audioRecorder.isRecording) await audioRecorder.stop();
        await audioRecorder.prepareToRecordAsync();
      } catch (resetError) {
        console.warn("[useVoiceTranscription] recorder reset failed", resetError);
      }
      Alert.alert(t.chat.couldntTranscribe, t.chat.attachmentReplies.voice);
    }
  };

  const seconds = Math.round(recorderState.durationMillis / 1000);
  const durationLabel = `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;

  return { isRecording, isTranscribing, durationLabel, toggleRecording };
}
