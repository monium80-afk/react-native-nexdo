import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { ATTACHMENT_REPLIES, INBOX_WELCOME_MESSAGE } from "@/data/aiPrompts";
import { classifyIntent } from "@/lib/ai/classifyIntent";
import type { StructuredAction } from "@/lib/ai/types";
import { fetchMessages, subscribeToMessages, upsertMessageRow } from "@/lib/supabaseSync";
import { useTaskStore } from "@/store/useTaskStore";
import type { ChatAttachment, ChatMessage } from "@/types/chat";

const AI_REPLY_DELAY_MS = 700;
const RECENT_TASK_LIMIT = 5;
const YES_PATTERN = /^(yes|yep|yeah|sure|do it|confirm|ok|okay|go ahead)\b/i;
const NO_PATTERN = /^(no|nope|cancel|never ?mind|don'?t)\b/i;

const pendingReplyTimeouts = new Set<ReturnType<typeof setTimeout>>();

// Same local-first background sync approach as useTaskStore.
let realtimeChannel: RealtimeChannel | null = null;

function syncUpsert(message: ChatMessage, userId: string | null) {
  if (!userId) return;
  upsertMessageRow(message, userId).catch((error) => console.warn("[useChatStore] upsert failed", error));
}

type PendingAction = { action: StructuredAction; label: string };

type ChatStore = {
  messages: ChatMessage[];
  isAiTyping: boolean;
  recentlyMentionedTaskIds: string[];
  pendingAction: PendingAction | null;
  syncUserId: string | null;
  hydrateFromSupabase: (userId: string) => Promise<void>;
  subscribeToRealtime: (userId: string) => void;
  unsubscribeFromRealtime: () => void;
  sendMessage: (text: string, attachment?: ChatAttachment, contextTaskId?: string) => string;
  seedMessage: (text: string, relatedTaskId?: string) => void;
  updateMessageAttachment: (messageId: string, attachment: ChatAttachment) => void;
  confirmPendingAction: () => void;
  cancelPendingAction: () => void;
  handleSignOut: () => Promise<void>;
};

const initialMessages = (): ChatMessage[] => [
  {
    id: "welcome",
    role: "ai",
    text: INBOX_WELCOME_MESSAGE,
    createdAt: new Date().toISOString(),
  },
];

function confirmationPrompt(action: StructuredAction): string {
  switch (action.type) {
    case "CREATE_TASK":
      return action.drafts.length === 1
        ? `I found 1 task: "${action.drafts[0].title}". Want me to add it?`
        : `I found ${action.drafts.length} tasks: ${action.drafts.map((d) => `"${d.title}"`).join(", ")}. Want me to add them?`;
    case "DELETE_TASK": {
      const title = useTaskStore.getState().tasks.find((t) => t.id === action.taskId)?.title ?? "this task";
      return `Delete "${title}"? This can't be undone.`;
    }
    default:
      return "Want me to go ahead with that?";
  }
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => {
      const pushMessage = (message: ChatMessage) => {
        set((state) => ({ messages: [...state.messages, message] }));
        syncUpsert(message, get().syncUserId);
      };

      const rememberTask = (taskId?: string) => {
        if (!taskId) return;
        set((state) => ({
          recentlyMentionedTaskIds: [taskId, ...state.recentlyMentionedTaskIds.filter((id) => id !== taskId)].slice(
            0,
            RECENT_TASK_LIMIT,
          ),
        }));
      };

      const respondWith = (text: string, relatedTaskId?: string) => {
        pushMessage({
          id: `${Date.now()}-ai`,
          role: "ai",
          text,
          createdAt: new Date().toISOString(),
          relatedTaskId,
        });
        rememberTask(relatedTaskId);
        set({ isAiTyping: false });
      };

      const executeAction = (action: StructuredAction) => {
        const result = useTaskStore.getState().applyStructuredAction(action);
        respondWith(result.message, result.taskId);
      };

      const handleClassifiedAction = (action: StructuredAction) => {
        if (action.confirmationTier === "confirm-required") {
          const prompt = confirmationPrompt(action);
          set({ pendingAction: { action, label: prompt } });
          respondWith(prompt);
          return;
        }
        executeAction(action);
      };

      return {
        messages: initialMessages(),
        isAiTyping: false,
        recentlyMentionedTaskIds: [],
        pendingAction: null,
        syncUserId: null,

        // Supabase becomes the source of truth for a signed-in user, same
        // as useTaskStore — an empty remote result means this user has no
        // synced history yet, so the local welcome message stays put.
        hydrateFromSupabase: async (userId) => {
          set({ syncUserId: userId });
          try {
            const remoteMessages = await fetchMessages(userId);
            if (remoteMessages.length > 0) set({ messages: remoteMessages });
          } catch (error) {
            console.warn("[useChatStore] hydrate failed", error);
          }
        },

        subscribeToRealtime: (userId) => {
          if (realtimeChannel) return;
          realtimeChannel = subscribeToMessages(userId, (message) => {
            set((state) => {
              if (state.messages.some((m) => m.id === message.id)) {
                return { messages: state.messages.map((m) => (m.id === message.id ? message : m)) };
              }
              return { messages: [...state.messages, message] };
            });
          });
        },

        unsubscribeFromRealtime: () => {
          realtimeChannel?.unsubscribe();
          realtimeChannel = null;
        },

        updateMessageAttachment: (messageId, attachment) => {
          set((state) => ({
            messages: state.messages.map((m) => (m.id === messageId ? { ...m, attachment } : m)),
          }));
          const updated = get().messages.find((m) => m.id === messageId);
          if (updated) syncUpsert(updated, get().syncUserId);
        },

        sendMessage: (text, attachment, contextTaskId) => {
          const trimmed = text.trim();
          if (!trimmed && !attachment) return "";

          const userMessage: ChatMessage = {
            id: `${Date.now()}-user`,
            role: "user",
            text: trimmed || attachment?.label || "",
            createdAt: new Date().toISOString(),
            attachment,
            relatedTaskId: contextTaskId,
          };
          set((state) => ({ messages: [...state.messages, userMessage], isAiTyping: true }));
          syncUpsert(userMessage, get().syncUserId);

          const replyTimeout = setTimeout(() => {
            pendingReplyTimeouts.delete(replyTimeout);

            if (attachment) {
              set({ pendingAction: null });
              respondWith(ATTACHMENT_REPLIES[attachment.kind]);
              return;
            }

            const { pendingAction } = get();
            if (pendingAction) {
              if (YES_PATTERN.test(trimmed)) {
                set({ pendingAction: null });
                executeAction(pendingAction.action);
                return;
              }
              if (NO_PATTERN.test(trimmed)) {
                set({ pendingAction: null });
                respondWith("No worries — I won't make that change.");
                return;
              }
              set({ pendingAction: null });
            }

            const action = classifyIntent({
              text: trimmed,
              now: new Date(),
              currentTaskId: contextTaskId,
              recentTaskIds: get().recentlyMentionedTaskIds,
              tasks: useTaskStore.getState().tasks,
            });
            handleClassifiedAction(action);
          }, AI_REPLY_DELAY_MS);
          pendingReplyTimeouts.add(replyTimeout);
          return userMessage.id;
        },

        seedMessage: (text, relatedTaskId) => {
          pushMessage({
            id: `${Date.now()}-seed`,
            role: "ai",
            text,
            createdAt: new Date().toISOString(),
            relatedTaskId,
          });
        },

        confirmPendingAction: () => {
          const { pendingAction } = get();
          if (!pendingAction) return;
          set({ pendingAction: null });
          executeAction(pendingAction.action);
        },

        cancelPendingAction: () => {
          if (!get().pendingAction) return;
          set({ pendingAction: null });
          respondWith("No worries — I won't make that change.");
        },

        handleSignOut: async () => {
          pendingReplyTimeouts.forEach(clearTimeout);
          pendingReplyTimeouts.clear();
          realtimeChannel?.unsubscribe();
          realtimeChannel = null;
          set({
            messages: initialMessages(),
            isAiTyping: false,
            recentlyMentionedTaskIds: [],
            pendingAction: null,
            syncUserId: null,
          });
          await AsyncStorage.removeItem("nexdo-chat");
        },
      };
    },
    {
      name: "nexdo-chat",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ messages: state.messages }),
    },
  ),
);
