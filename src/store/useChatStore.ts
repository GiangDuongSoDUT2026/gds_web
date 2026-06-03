import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatCard, ChatMessage, Citation } from "@/types/api";

interface ChatState {
  sessionId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  courseId: string | null;
  pendingCitations: Citation[];

  setSessionId: (id: string) => void;
  setCourseId: (id: string | null) => void;
  addMessage: (msg: ChatMessage) => void;
  appendToLastMessage: (chunk: string) => void;
  setLastMessageCitations: (citations: Citation[]) => void;
  addCardToLastMessage: (card: ChatCard) => void;
  setIsStreaming: (streaming: boolean) => void;
  clearMessages: () => void;
  clearSession: () => void;
  restoreSession: (sessionId: string, messages: ChatMessage[]) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      sessionId: null,
      messages: [],
      isStreaming: false,
      courseId: null,
      pendingCitations: [],

      setSessionId: (id) => set({ sessionId: id }),

      setCourseId: (id) => set({ courseId: id }),

      addMessage: (msg) =>
        set((state) => ({ messages: [...state.messages, msg] })),

      appendToLastMessage: (chunk) =>
        set((state) => {
          const messages = [...state.messages];
          if (messages.length === 0) return state;
          const last = messages[messages.length - 1];
          messages[messages.length - 1] = {
            ...last,
            content: last.content + chunk,
          };
          return { messages };
        }),

      setLastMessageCitations: (citations) =>
        set((state) => {
          const messages = [...state.messages];
          if (messages.length === 0) return state;
          const last = messages[messages.length - 1];
          messages[messages.length - 1] = { ...last, citations };
          return { messages };
        }),

      addCardToLastMessage: (card) =>
        set((state) => {
          const messages = [...state.messages];
          if (messages.length === 0) return state;
          const last = messages[messages.length - 1];
          const existingCards = last.cards ?? [];
          messages[messages.length - 1] = {
            ...last,
            cards: [...existingCards, card],
          };
          return { messages };
        }),

      setIsStreaming: (streaming) => set({ isStreaming: streaming }),

      clearMessages: () => set({ messages: [] }),

      clearSession: () =>
        set({ sessionId: null, messages: [], isStreaming: false }),

      restoreSession: (sessionId, messages) =>
        set({ sessionId, messages, isStreaming: false }),
    }),
    {
      name: "gds-chat-session",
      // Only persist sessionId and messages (not streaming state)
      partialize: (state) => ({
        sessionId: state.sessionId,
        messages: state.messages.slice(-100), // keep last 100 messages
      }),
    }
  )
);
