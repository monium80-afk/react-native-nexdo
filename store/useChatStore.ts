import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { ExtractTextResponseBody } from "@/app/api/extract-text+api";
import { ATTACHMENT_REPLIES, INBOX_WELCOME_MESSAGE } from "@/data/aiPrompts";
import { classifyIntent } from "@/lib/ai/classifyIntent";
import { readFileAsBase64, resolveMimeType } from "@/lib/ai/media";
import type { StructuredAction } from "@/lib/ai/types";
import { apiPost } from "@/lib/api";
import { fetchMessages, subscribeToMessages, upsertMessageRow } from "@/lib/supabaseSync";
import { useTaskStore } from "@/store/useTaskStore";
import type { ChatAttachment, ChatMessage } from "@/types/chat";
import type { Task } from "@/types/task";

const RECENT_TASK_LIMIT = 5;
const HISTORY_TURNS = 6;
const YES_PATTERN = /^(yes|yep|yeah|sure|do it|confirm|ok|okay|go ahead)\b/i;
const NO_PATTERN = /^(no|nope|cancel|never ?mind|don'?t)\b/i;
// Literal "undo" is intercepted here rather than sent to the AI — see
// TASK_MANAGER_SYSTEM_PROMPT §6.2, which is written assuming this.
const UNDO_PATTERN = /^(undo( (that|it))?|revert( (that|it))?)[.!]?$/i;

// Invalidates any in-flight classifyIntent() call so its response is
// dropped if the user signs out (or the store resets) before it resolves —
// the async request has no way to know the chat underneath it changed.
let signOutGeneration = 0;

// Same local-first background sync approach as useTaskStore.
let realtimeChannel: RealtimeChannel | null = null;

function syncUpsert(message: ChatMessage, userId: string | null) {
  if (!userId) return;
  upsertMessageRow(message, userId).catch((error) => console.warn("[useChatStore] upsert failed", error));
}

function createMessageId(role: "user" | "ai" | "seed"): string {
  return `message-${role}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

type PendingAction = { action: StructuredAction; label: string };

// Single-slot "undo the most recent action" (taxonomy 6.2). A create is
// undone by deleting the task(s) it made; anything else is undone by
// restoring a snapshot of the task taken right before the mutation.
type UndoEntry =
  | { kind: "create"; taskIds: string[] }
  | { kind: "restore"; snapshots: { taskId: string; before: Task | null }[] };

type ChatStore = {
  messages: ChatMessage[];
  isAiTyping: boolean;
  recentlyMentionedTaskIds: string[];
  pendingActions: PendingAction[];
  lastUndo: UndoEntry | null;
  redirectToNext: { minutes: number } | null;
  syncUserId: string | null;
  hydrateFromSupabase: (userId: string) => Promise<void>;
  subscribeToRealtime: (userId: string) => void;
  unsubscribeFromRealtime: () => void;
  sendMessage: (text: string, attachment?: ChatAttachment, contextTaskId?: string) => string;
  seedMessage: (text: string, relatedTaskId?: string) => void;
  updateMessageAttachment: (messageId: string, attachment: ChatAttachment) => void;
  updateMessageText: (messageId: string, text: string) => void;
  confirmPendingActions: () => void;
  cancelPendingActions: () => void;
  undoLastAction: () => void;
  clearRedirectToNext: () => void;
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

// Only used when the offline heuristic fallback produces a confirm-required
// action — the real AI path always has its own narrated "reply" instead.
function confirmationPrompt(action: StructuredAction): string {
  switch (action.type) {
    case "CREATE_TASK":
      return action.drafts.length === 1
        ? `I found 1 task: "${action.drafts[0].title}". Want me to add it?`
        : `I found ${action.drafts.length} tasks: ${action.drafts.map((d) => `"${d.title}"`).join(", ")}. Want me to add them?`;
    default:
      return "Want me to go ahead with that?";
  }
}

// What to snapshot before mutating, so undo can restore it verbatim.
// CREATE_TASK is handled separately (undo = delete the new task), and
// read-only/routing actions (QUERY, CLARIFY, UNKNOWN, REDIRECT_NEXT) never
// touch a task, so there's nothing to snapshot.
function snapshotBefore(action: StructuredAction, tasks: Task[]): { taskId: string; before: Task | null }[] {
  const taskId =
    action.type === "UPDATE_TASK" ||
    action.type === "COMPLETE_TASK" ||
    action.type === "DELETE_TASK" ||
    action.type === "ADD_TASK_CONTEXT" ||
    action.type === "RESCHEDULE_TASK" ||
    action.type === "SKIP_TASK" ||
    action.type === "BREAKDOWN_TASK"
      ? action.taskId
      : null;
  if (!taskId) return [];
  const task = tasks.find((t) => t.id === taskId);
  return task ? [{ taskId, before: task }] : [];
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
          id: createMessageId("ai"),
          role: "ai",
          text,
          createdAt: new Date().toISOString(),
          relatedTaskId,
        });
        rememberTask(relatedTaskId);
        set({ isAiTyping: false });
      };

      // Applies one action, and — unless it's a pure read/route — records
      // enough to undo it later as this turn's most recent mutation.
      const executeAction = (action: StructuredAction): { message: string; taskId?: string } => {
        if (action.type === "REDIRECT_NEXT") {
          set({ redirectToNext: { minutes: action.availableMinutes } });
          return useTaskStore.getState().applyStructuredAction(action);
        }

        const beforeSnapshots = snapshotBefore(action, useTaskStore.getState().tasks);
        const result = useTaskStore.getState().applyStructuredAction(action);

        if (action.type === "CREATE_TASK") {
          const ids = result.taskIds ?? (result.taskId ? [result.taskId] : []);
          if (ids.length > 0) set({ lastUndo: { kind: "create", taskIds: ids } });
        } else if (beforeSnapshots.length > 0) {
          set({ lastUndo: { kind: "restore", snapshots: beforeSnapshots } });
        }

        return result;
      };

      // A turn can carry several actions (compound messages) plus one
      // narrated "reply" covering all of them. Confirm-required actions are
      // queued together behind a single Yes/No; everything else applies now.
      const handleClassifiedActions = (actions: StructuredAction[], narratedReply: string | null) => {
        const confirmRequired = actions.filter((a) => a.confirmationTier === "confirm-required");
        const immediate = actions.filter((a) => a.confirmationTier !== "confirm-required");

        let lastTaskId: string | undefined;
        const executedMessages: string[] = [];
        for (const action of immediate) {
          const result = executeAction(action);
          executedMessages.push(result.message);
          if (result.taskId) lastTaskId = result.taskId;
        }

        if (confirmRequired.length > 0) {
          set({
            pendingActions: confirmRequired.map((action) => ({ action, label: narratedReply ?? confirmationPrompt(action) })),
          });
        }

        const fallbackMessage = [...executedMessages, ...confirmRequired.map(confirmationPrompt)].join(" ") || "Done.";
        respondWith(narratedReply ?? fallbackMessage, lastTaskId);
      };

      return {
        messages: initialMessages(),
        isAiTyping: false,
        recentlyMentionedTaskIds: [],
        pendingActions: [],
        lastUndo: null,
        redirectToNext: null,
        syncUserId: null,

        // Supabase becomes the source of truth for a signed-in user, same
        // as useTaskStore — an empty remote result means this user has no
        // synced history yet, so the local welcome message stays put.
        hydrateFromSupabase: async (userId) => {
          set({ syncUserId: userId });
          try {
            const remoteMessages = await fetchMessages(userId);
            if (get().syncUserId === userId) {
              set({ messages: remoteMessages.length > 0 ? remoteMessages : initialMessages() });
            }
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
              const insertAt = state.messages.findIndex((m) => m.createdAt > message.createdAt);
              const messages = [...state.messages];
              messages.splice(insertAt === -1 ? messages.length : insertAt, 0, message);
              return { messages };
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

        updateMessageText: (messageId, text) => {
          set((state) => ({
            messages: state.messages.map((m) => (m.id === messageId ? { ...m, text } : m)),
          }));
          const updated = get().messages.find((m) => m.id === messageId);
          if (updated) syncUpsert(updated, get().syncUserId);
        },

        sendMessage: (text, attachment, contextTaskId) => {
          const trimmed = text.trim();
          if (!trimmed && !attachment) return "";

          const userMessage: ChatMessage = {
            id: createMessageId("user"),
            role: "user",
            text: trimmed || attachment?.label || "",
            createdAt: new Date().toISOString(),
            attachment,
            relatedTaskId: contextTaskId,
          };
          const historyBeforeThisMessage = get().messages;
          set((state) => ({ messages: [...state.messages, userMessage], isAiTyping: true }));
          syncUpsert(userMessage, get().syncUserId);

          const generation = signOutGeneration;

          (async () => {
            // A photo/voice note/document is extracted to plain text first,
            // then fed through the exact same pipeline as typed text — see
            // CONTEXT YOU'LL RECEIVE in TASK_MANAGER_SYSTEM_PROMPT.
            let effectiveText = trimmed;
            if (attachment) {
              try {
                const base64 = await readFileAsBase64(attachment.uri);
                const extracted = await apiPost<ExtractTextResponseBody>("/api/extract-text", {
                  mimeType: resolveMimeType(attachment),
                  base64,
                  kind: attachment.kind,
                });
                if (generation !== signOutGeneration) return;
                effectiveText = extracted.text.trim();
                // Show what was actually heard/read instead of a generic
                // "Voice note" / "Photo attached" label once it's known.
                if (effectiveText) get().updateMessageText(userMessage.id, effectiveText);
              } catch (error) {
                console.warn("[useChatStore] media extraction failed", error);
                effectiveText = "";
              }
              if (!effectiveText) {
                set({ pendingActions: [] });
                respondWith(ATTACHMENT_REPLIES[attachment.kind]);
                return;
              }
            }

            if (UNDO_PATTERN.test(effectiveText)) {
              get().undoLastAction();
              return;
            }

            const { pendingActions } = get();
            if (pendingActions.length > 0) {
              if (YES_PATTERN.test(effectiveText)) {
                get().confirmPendingActions();
                return;
              }
              if (NO_PATTERN.test(effectiveText)) {
                get().cancelPendingActions();
                return;
              }
              set({ pendingActions: [] });
            }

            const history = historyBeforeThisMessage.slice(-HISTORY_TURNS).map((message) => ({
              role: message.role,
              text: message.text,
            }));

            const { actions, reply } = await classifyIntent({
              text: effectiveText,
              now: new Date(),
              currentTaskId: contextTaskId,
              recentTaskIds: get().recentlyMentionedTaskIds,
              tasks: useTaskStore.getState().tasks,
              history,
            });

            if (generation !== signOutGeneration) return; // signed out / reset mid-request
            handleClassifiedActions(actions, reply);
          })();

          return userMessage.id;
        },

        seedMessage: (text, relatedTaskId) => {
          pushMessage({
            id: createMessageId("seed"),
            role: "ai",
            text,
            createdAt: new Date().toISOString(),
            relatedTaskId,
          });
        },

        confirmPendingActions: () => {
          const { pendingActions } = get();
          if (pendingActions.length === 0) return;
          set({ pendingActions: [] });
          let lastTaskId: string | undefined;
          const messages = pendingActions.map(({ action }) => {
            const result = executeAction(action);
            if (result.taskId) lastTaskId = result.taskId;
            return result.message;
          });
          respondWith(messages.join(" "), lastTaskId);
        },

        cancelPendingActions: () => {
          if (get().pendingActions.length === 0) return;
          set({ pendingActions: [] });
          respondWith("No worries — I won't make that change.");
        },

        undoLastAction: () => {
          const { lastUndo } = get();
          if (!lastUndo) {
            respondWith("There's nothing to undo.");
            return;
          }
          set({ lastUndo: null });
          if (lastUndo.kind === "create") {
            lastUndo.taskIds.forEach((id) => useTaskStore.getState().restoreTaskSnapshot(id, null));
          } else {
            lastUndo.snapshots.forEach(({ taskId, before }) => useTaskStore.getState().restoreTaskSnapshot(taskId, before));
          }
          respondWith("Undone.");
        },

        clearRedirectToNext: () => set({ redirectToNext: null }),

        handleSignOut: async () => {
          signOutGeneration += 1;
          realtimeChannel?.unsubscribe();
          realtimeChannel = null;
          set({
            messages: initialMessages(),
            isAiTyping: false,
            recentlyMentionedTaskIds: [],
            pendingActions: [],
            lastUndo: null,
            redirectToNext: null,
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
