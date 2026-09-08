import { useUser } from "@clerk/expo";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GemLogo } from "@/components/GemLogo";
import { InboxInput } from "@/components/InboxInput";
import { SuggestionChip } from "@/components/SuggestionChip";
import { colors } from "@/constants/theme";
import { INBOX_QUICK_ACTIONS, INBOX_STARTER_SUGGESTIONS } from "@/data/aiPrompts";
import { generateAdvice } from "@/lib/ai/generateAdvice";
import { posthog } from "@/lib/posthog";
import { uploadAttachment } from "@/lib/supabaseStorage";
import { useChatStore } from "@/store/useChatStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useTaskStore } from "@/store/useTaskStore";
import type { ChatAttachment, ChatMessage } from "@/types/chat";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.role === "ai") {
    return (
      <View className="flex-row items-start gap-2.5 pr-12">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-cream-200">
          <GemLogo size={16} />
        </View>
        <View className="card card--cream-elevated flex-1 gap-2.5 p-4">
          <Text className="text-quote text-ink-cream">{message.text}</Text>
          <Text className="self-end font-grotesk-medium text-xs text-ink-cream-muted">
            {formatTime(message.createdAt)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="items-end gap-1 pl-12">
      <View className="rounded-2xl bg-orange-500 px-4 py-3">
        <Text className="font-grotesk-medium text-sm text-cream-50">{message.text}</Text>
      </View>
      <Text className="font-grotesk-medium text-xs text-ink-cream-muted">
        {formatTime(message.createdAt)}
      </Text>
    </View>
  );
}

function TypingBubble() {
  return (
    <View className="flex-row items-center gap-2.5 pr-16">
      <View className="h-8 w-8 items-center justify-center rounded-full bg-cream-200">
        <GemLogo size={16} />
      </View>
      <View className="card card--cream-elevated px-4 py-3.5">
        <Text className="text-quote text-ink-cream-muted">Typing…</Text>
      </View>
    </View>
  );
}

function InboxChatScreen({ contextTaskId, availableMinutes }: { contextTaskId?: string; mode?: string; availableMinutes?: number }) {
  const { user } = useUser();
  const messages = useChatStore((state) => state.messages);
  const isAiTyping = useChatStore((state) => state.isAiTyping);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const seedMessage = useChatStore((state) => state.seedMessage);
  const updateMessageAttachment = useChatStore((state) => state.updateMessageAttachment);
  const pendingAction = useChatStore((state) => state.pendingAction);
  const confirmPendingAction = useChatStore((state) => state.confirmPendingAction);
  const cancelPendingAction = useChatStore((state) => state.cancelPendingAction);
  const tasks = useTaskStore((state) => state.tasks);
  const planningStyle = useSettingsStore((state) => state.planningStyle);

  const pendingCount = tasks.filter((task) => task.status === "pending").length;
  const contextTask = contextTaskId ? tasks.find((task) => task.id === contextTaskId) : undefined;

  const [draft, setDraft] = useState("");
  const analysisSeededFor = useRef<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const hasUserReplied = messages.some((message) => message.role === "user");

  useEffect(() => {
    if (!contextTask || analysisSeededFor.current === contextTask.id) return;
    analysisSeededFor.current = contextTask.id;
    let cancelled = false;
    generateAdvice(contextTask, planningStyle, availableMinutes).then((advice) => {
      if (cancelled) return;
      seedMessage(
        `Here's my read on "${contextTask.title}" — it's a ${contextTask.complexity} task. ${advice}`,
        contextTask.id,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [contextTask, planningStyle, availableMinutes, seedMessage]);

  const handleSend = (text: string, attachment?: ChatAttachment) => {
    if (!text.trim()) return;
    sendMessage(text, attachment, contextTaskId);
    setDraft("");
  };

  const handleAttachment = async (attachment: ChatAttachment) => {
    posthog.capture("inbox_attachment_captured", { kind: attachment.kind });
    const messageId = sendMessage(attachment.label, attachment, contextTaskId);

    // Local file:// uris don't survive a reinstall or another device — push
    // the file to Supabase Storage in the background and swap the message's
    // attachment over to the storage path once it lands.
    if (!user || !messageId) return;
    try {
      const path = await uploadAttachment(
        attachment.uri,
        user.id,
        attachment.name ?? `${attachment.kind}-${Date.now()}`,
        attachment.mimeType,
      );
      updateMessageAttachment(messageId, { ...attachment, uri: path });
    } catch (error) {
      console.warn("[ai-chat] attachment upload failed", error);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream[100] }} edges={["top"]}>
      <View className="flex-row items-center gap-3 border-b border-cream-300 bg-cream-100 px-6 pb-4 pt-2">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-orange-100">
          <GemLogo size={22} />
        </View>
        <View className="flex-1">
          <Text className="text-card-title text-ink-cream">
            {contextTask ? contextTask.title : "Nexdo Inbox"}
          </Text>
          <Text className="font-grotesk-medium text-sm text-ink-cream-muted">
            {contextTask ? (
              "Ask me to analyze, adjust, or update this task."
            ) : (
              <>
                <Text className="font-grotesk-bold text-ink-cream">{pendingCount}</Text> active tasks in queue
              </>
            )}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{ gap: 16, padding: 24 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}
          {isAiTyping ? <TypingBubble /> : null}

          {pendingAction ? (
            <View className="flex-row gap-2 pr-8">
              <SuggestionChip emoji="✅" label="Yes, do it" onPress={confirmPendingAction} />
              <SuggestionChip emoji="✕" label="Cancel" onPress={cancelPendingAction} />
            </View>
          ) : null}

          {!hasUserReplied && !contextTask ? (
            <View className="gap-2.5 pr-8">
              {INBOX_STARTER_SUGGESTIONS.map((suggestion) => (
                <SuggestionChip
                  key={suggestion.id}
                  emoji={suggestion.emoji}
                  label={suggestion.label}
                  fullWidth
                  onPress={() => handleSend(suggestion.label)}
                />
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View className="gap-3 border-t border-cream-300 bg-cream-100 px-6 pb-2 pt-3">
          {!contextTask ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {INBOX_QUICK_ACTIONS.map((action) => (
                <SuggestionChip
                  key={action.id}
                  emoji={action.emoji}
                  label={action.label}
                  onPress={() => handleSend(action.label)}
                />
              ))}
            </ScrollView>
          ) : null}

          <InboxInput
            value={draft}
            onChangeText={setDraft}
            onSend={() => handleSend(draft)}
            onAttachment={handleAttachment}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function AiChat() {
  const { taskId, mode, minutes } = useLocalSearchParams<{ taskId?: string; mode?: string; minutes?: string }>();
  const availableMinutes = minutes ? Number.parseInt(minutes, 10) : undefined;
  return <InboxChatScreen contextTaskId={taskId} mode={mode} availableMinutes={availableMinutes} />;
}
