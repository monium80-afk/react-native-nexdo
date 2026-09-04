import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GemLogo } from "@/components/GemLogo";
import { InboxInput, type AttachmentKind } from "@/components/InboxInput";
import { SuggestionChip } from "@/components/SuggestionChip";
import { colors } from "@/constants/theme";
import { ATTACHMENT_REPLIES, INBOX_QUICK_ACTIONS, INBOX_STARTER_SUGGESTIONS } from "@/data/aiPrompts";
import { posthog } from "@/lib/posthog";
import { useChatStore } from "@/store/useChatStore";
import { useTaskStore } from "@/store/useTaskStore";
import type { ChatMessage } from "@/types/chat";

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

function TaskDetailPlaceholder({ taskId, mode }: { taskId?: string; mode?: string }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream[100] }}>
      <View className="flex-1 items-center justify-center gap-2 px-6">
        <Text className="text-title text-ink-cream">
          {mode === "analyze" ? "Analyzing Task" : "AI Chat"}
        </Text>
        {taskId ? <Text className="text-body text-ink-cream-muted">Task: {taskId}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

function InboxChatScreen() {
  const messages = useChatStore((state) => state.messages);
  const isAiTyping = useChatStore((state) => state.isAiTyping);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const pendingCount = useTaskStore(
    (state) => state.tasks.filter((task) => task.status === "pending").length,
  );

  const [draft, setDraft] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const hasUserReplied = messages.some((message) => message.role === "user");

  const handleSend = (text: string, reply?: string) => {
    if (!text.trim()) return;
    sendMessage(text, reply);
    setDraft("");
  };

  const handleAttachment = (kind: AttachmentKind, label: string) => {
    posthog.capture("inbox_attachment_captured", { kind });
    sendMessage(label, ATTACHMENT_REPLIES[kind]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream[100] }} edges={["top"]}>
      <View className="flex-row items-center gap-3 border-b border-cream-300 bg-cream-100 px-6 pb-4 pt-2">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-orange-100">
          <GemLogo size={22} />
        </View>
        <View className="flex-1">
          <Text className="text-card-title text-ink-cream">Nexdo Inbox</Text>
          <Text className="font-grotesk-medium text-sm text-ink-cream-muted">
            <Text className="font-grotesk-bold text-ink-cream">{pendingCount}</Text> active tasks in
            queue
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

          {!hasUserReplied ? (
            <View className="gap-2.5 pr-8">
              {INBOX_STARTER_SUGGESTIONS.map((suggestion) => (
                <SuggestionChip
                  key={suggestion.id}
                  emoji={suggestion.emoji}
                  label={suggestion.label}
                  fullWidth
                  onPress={() => handleSend(suggestion.label, suggestion.reply)}
                />
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View className="gap-3 border-t border-cream-300 bg-cream-100 px-6 pb-2 pt-3">
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
                onPress={() => handleSend(action.label, action.reply)}
              />
            ))}
          </ScrollView>

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
  const { taskId, mode } = useLocalSearchParams<{ taskId?: string; mode?: string }>();

  if (taskId || mode) {
    return <TaskDetailPlaceholder taskId={taskId} mode={mode} />;
  }

  return <InboxChatScreen />;
}
