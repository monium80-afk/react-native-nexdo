import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { INBOX_WELCOME_MESSAGE } from "@/data/aiPrompts";
import type { ChatMessage } from "@/types/chat";

const AI_REPLY_DELAY_MS = 700;
const FALLBACK_AI_REPLY =
  "Got it — logged in your inbox. I'll fold this into your plan next time we sync.";

type ChatStore = {
  messages: ChatMessage[];
  isAiTyping: boolean;
  sendMessage: (text: string, aiReply?: string) => void;
};

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      messages: [
        {
          id: "welcome",
          role: "ai",
          text: INBOX_WELCOME_MESSAGE,
          createdAt: new Date().toISOString(),
        },
      ],
      isAiTyping: false,
      sendMessage: (text, aiReply) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const userMessage: ChatMessage = {
          id: `${Date.now()}-user`,
          role: "user",
          text: trimmed,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ messages: [...state.messages, userMessage], isAiTyping: true }));

        setTimeout(() => {
          const reply: ChatMessage = {
            id: `${Date.now()}-ai`,
            role: "ai",
            text: aiReply ?? FALLBACK_AI_REPLY,
            createdAt: new Date().toISOString(),
          };
          set((state) => ({ messages: [...state.messages, reply], isAiTyping: false }));
        }, AI_REPLY_DELAY_MS);
      },
    }),
    {
      name: "nexdo-chat",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
