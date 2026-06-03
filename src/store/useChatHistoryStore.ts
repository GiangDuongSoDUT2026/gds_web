import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatMessage } from "@/types/api";

export interface ChatHistoryItem {
  id: string;
  title: string;
  preview: string;
  createdAt: number;
  pinned: boolean;
}

interface ChatHistoryState {
  items: ChatHistoryItem[];
  // messages per session_id for history restore
  sessionMessages: Record<string, ChatMessage[]>;

  add: (item: ChatHistoryItem) => void;
  pin: (id: string, pinned: boolean) => void;
  remove: (id: string) => void;
  saveSessionMessages: (id: string, messages: ChatMessage[]) => void;
  getSessionMessages: (id: string) => ChatMessage[];
}

export const useChatHistoryStore = create<ChatHistoryState>()(
  persist(
    (set, get) => ({
      items: [],
      sessionMessages: {},

      add: (item) =>
        set((s) => {
          const existing = s.items.find((i) => i.id === item.id);
          // Preserve pinned status and original creation time if already in history
          const merged = existing
            ? { ...item, pinned: existing.pinned, createdAt: existing.createdAt }
            : item;
          return {
            items: [merged, ...s.items.filter((i) => i.id !== item.id)].slice(0, 50),
          };
        }),

      pin: (id, pinned) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, pinned } : i)),
        })),

      remove: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.sessionMessages;
          return {
            items: s.items.filter((i) => i.id !== id),
            sessionMessages: rest,
          };
        }),

      saveSessionMessages: (id, messages) =>
        set((s) => ({
          sessionMessages: {
            ...s.sessionMessages,
            [id]: messages.slice(-100),
          },
        })),

      getSessionMessages: (id) => get().sessionMessages[id] ?? [],
    }),
    { name: "gds-chat-history" }
  )
);
