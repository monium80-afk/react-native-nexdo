import { useUser } from "@clerk/expo";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { GemLogo } from "@/components/GemLogo";
import { InboxInput } from "@/components/InboxInput";
import { SuggestionChip } from "@/components/SuggestionChip";
import { TaskConfirmationCard } from "@/components/TaskConfirmationCard";
import { colors } from "@/constants/theme";
import { INBOX_QUICK_ACTIONS, INBOX_STARTER_SUGGESTIONS } from "@/data/aiPrompts";
import { adviceToText, generateAdvice } from "@/lib/ai/generateAdvice";
import { posthog } from "@/lib/posthog";
import { uploadAttachment } from "@/lib/supabaseStorage";
import { useCategoryStore } from "@/store/useCategoryStore";
import { useChatStore } from "@/store/useChatStore";
import { useTaskStore } from "@/store/useTaskStore";
import type { ChatAttachment, ChatMessage } from "@/types/chat";

const QUICK_ACTION_ICON_SIZE = 18;

// Each quick-action chip gets its own colored icon, keyed by INBOX_QUICK_ACTIONS id.
const QUICK_ACTION_ICONS: Record<string, ReactNode> = {
  "whats-next": <Feather name="plus" size={QUICK_ACTION_ICON_SIZE} color={colors.quickAction.add} />,
  "breakdown-top": <Feather name="check" size={QUICK_ACTION_ICON_SIZE} color={colors.quickAction.complete} />,
  "quick-win": <Feather name="trash-2" size={QUICK_ACTION_ICON_SIZE} color={colors.quickAction.remove} />,
  "overdue-catchup": <Feather name="refresh-cw" size={QUICK_ACTION_ICON_SIZE} color={colors.quickAction.change} />,
  "break-down": (
    <MaterialCommunityIcons name="format-list-checks" size={QUICK_ACTION_ICON_SIZE} color={colors.quickAction.breakDown} />
  ),
  prioritize: <Feather name="target" size={QUICK_ACTION_ICON_SIZE} color={colors.quickAction.prioritize} />,
};

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
      <Animated.View entering={FadeInUp.duration(240)} className="flex-row items-start gap-2.5 pr-1">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-cream-200">
          <GemLogo size={16} />
        </View>
        <View className="card card--cream-elevated flex-1 gap-2.5 p-4">
          <Text className="text-quote text-ink-cream">{message.text}</Text>
          <Text className="self-end font-grotesk-medium text-xs text-ink-cream-muted">
            {formatTime(message.createdAt)}
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(220)} className="flex-row items-center justify-end gap-2 pl-1">
      <View className="flex-1 rounded-2xl bg-charcoal-900 px-4 py-3">
        <Text className="font-grotesk-medium text-sm text-ink-charcoal">{message.text}</Text>
        <Text className="mt-1 self-end font-grotesk-medium text-xs text-ink-charcoal-muted">
          {formatTime(message.createdAt)}
        </Text>
      </View>
      <View className="h-8 w-8 items-center justify-center rounded-full bg-charcoal-900">
        <Feather name="user" size={16} color={colors.ink.charcoal} />
      </View>
    </Animated.View>
  );
}

function TypingBubble() {
  return (
    <Animated.View entering={FadeInUp.duration(200)} className="flex-row items-center gap-2.5 pr-1">
      <View className="h-8 w-8 items-center justify-center rounded-full bg-cream-200">
        <GemLogo size={16} />
      </View>
      <View className="card card--cream-elevated px-4 py-3.5">
        <Text className="text-quote text-ink-cream-muted">Typing…</Text>
      </View>
    </Animated.View>
  );
}

function InboxChatScreen({ contextTaskId, availableMinutes }: { contextTaskId?: string; mode?: string; availableMinutes?: number }) {
  const router = useRouter();
  const { user } = useUser();
  const messages = useChatStore((state) => state.messages);
  const isAiTyping = useChatStore((state) => state.isAiTyping);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const seedMessage = useChatStore((state) => state.seedMessage);
  const updateMessageAttachment = useChatStore((state) => state.updateMessageAttachment);
  const pendingActions = useChatStore((state) => state.pendingActions);
  const confirmPendingActions = useChatStore((state) => state.confirmPendingActions);
  const cancelPendingActions = useChatStore((state) => state.cancelPendingActions);
  const updatePendingDraft = useChatStore((state) => state.updatePendingDraft);
  const redirectToNext = useChatStore((state) => state.redirectToNext);
  const clearRedirectToNext = useChatStore((state) => state.clearRedirectToNext);
  const tasks = useTaskStore((state) => state.tasks);

  const pendingCount = tasks.filter((task) => task.status === "pending").length;
  const contextTask = contextTaskId ? tasks.find((task) => task.id === contextTaskId) : undefined;

  const [draft, setDraft] = useState("");
  const analysisSeededFor = useRef<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const hasUserReplied = messages.some((message) => message.role === "user");

  useEffect(() => {
    if (!contextTaskId || analysisSeededFor.current === contextTaskId) return;
    const task = useTaskStore.getState().tasks.find((candidate) => candidate.id === contextTaskId);
    if (!task) return;
    let cancelled = false;
    generateAdvice(task, useCategoryStore.getState().categories, availableMinutes).then((advice) => {
      if (cancelled) return;
      seedMessage(
        `Here's my read on "${task.title}" — it's a ${task.complexity} task. ${adviceToText(advice)}`,
        task.id,
      );
    });
    return () => {
      cancelled = true;
      if (analysisSeededFor.current === contextTaskId) analysisSeededFor.current = null;
    };
  }, [contextTaskId, availableMinutes, seedMessage]);

  const handleSend = (text: string, attachment?: ChatAttachment) => {
    if (!text.trim()) return;
    sendMessage(text, attachment, contextTaskId);
    setDraft("");
  };

  // Quick-action chips (Add, Mark complete, Remove, Change, Break down, Prioritize) don't
  // send on their own — they drop their label into the draft so the user
  // can add the specifics (which task, what deadline) before sending.
  const handleQuickAction = (label: string) => {
    setDraft(`${label}: `);
  };

  const handleOpenNext = () => {
    const minutes = redirectToNext?.minutes;
    clearRedirectToNext();
    router.push({ pathname: "/(tabs)", params: minutes ? { minutes: String(minutes) } : undefined });
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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
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

          {pendingActions.length > 0 ? (
            <Animated.View entering={FadeInUp.duration(240)} className="flex-row items-start gap-2.5 pr-1">
              {/* Mirrors the avatar column in ChatBubble so this card's left
                  edge lands exactly where the AI bubbles' do. */}
              <View className="h-8 w-8" />
              <View className="flex-1 gap-3">
                {pendingActions.flatMap((pending, index) =>
                  pending.action.type === "CREATE_TASK"
                    ? pending.action.drafts.map((draft, draftIndex) => (
                        <TaskConfirmationCard
                          key={`${index}-${draftIndex}`}
                          draft={draft}
                          onAdd={confirmPendingActions}
                          onDismiss={cancelPendingActions}
                          onChange={(patch) => updatePendingDraft(index, draftIndex, patch)}
                        />
                      ))
                    : [],
                )}
                {pendingActions.some((pending) => pending.action.type !== "CREATE_TASK") ? (
                  <View className="flex-row gap-2">
                    <SuggestionChip emoji="✅" label="Yes, do it" onPress={confirmPendingActions} />
                    <SuggestionChip emoji="✕" label="Cancel" onPress={cancelPendingActions} />
                  </View>
                ) : null}
              </View>
            </Animated.View>
          ) : null}

          {redirectToNext ? (
            <Animated.View entering={FadeInUp.duration(240)} className="flex-row gap-2 pr-8">
              <SuggestionChip emoji="🎯" label={`Open Next (${redirectToNext.minutes} min)`} onPress={handleOpenNext} />
            </Animated.View>
          ) : null}

          {!hasUserReplied && !contextTask ? (
            <View className="gap-2.5 pr-8">
              {INBOX_STARTER_SUGGESTIONS.map((suggestion, index) => (
                <Animated.View key={suggestion.id} entering={FadeInUp.delay(index * 60).duration(240)}>
                  <SuggestionChip
                    emoji={suggestion.emoji}
                    label={suggestion.label}
                    fullWidth
                    onPress={() => handleSend(suggestion.label)}
                  />
                </Animated.View>
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
                  icon={QUICK_ACTION_ICONS[action.id]}
                  onPress={() => handleQuickAction(action.label)}
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
