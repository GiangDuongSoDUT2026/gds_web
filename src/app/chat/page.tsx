"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Send, Loader2, Bot, User as UserIcon, Plus, Pin, Trash2,
  PanelLeft, BookOpen, Clock, CheckCircle, TrendingUp, Video,
  MessageSquare, ChevronRight, Paperclip,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ChatCardView } from "@/components/chat/StatCard";
import { ChatUploadDialog } from "@/components/chat/ChatUploadDialog";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useChatStore } from "@/store/useChatStore";
import { useChatHistoryStore } from "@/store/useChatHistoryStore";
import { useAuthStore } from "@/store/useAuthStore";
import { createChatSession, getLearningStats, getMyProgress, apiClient } from "@/lib/api";
import { formatTimestamp } from "@/lib/utils";
import type { Citation, ChatCard, LectureProgress } from "@/types/api";

// ─── Chat History Sidebar (left, closable) ────────────────────────────────────

function ChatHistorySidebar({
  onClose,
  currentSessionId,
  onNewChat,
}: {
  onClose: () => void;
  currentSessionId: string | null;
  onNewChat: () => void;
}) {
  const { items, pin, remove } = useChatHistoryStore();

  const pinned = items.filter((i) => i.pinned);
  const recent = items.filter((i) => !i.pinned);

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b">
        <span className="text-sm font-semibold">Chat History</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <PanelLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* New Chat */}
      <div className="p-2 border-b">
        <Button className="w-full gap-2" size="sm" onClick={onNewChat}>
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Sessions list */}
      <ScrollArea className="flex-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground px-3 text-center">
            <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs">No chat history yet</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {pinned.length > 0 && (
              <>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1 py-1">
                  Pinned
                </p>
                {pinned.map((item) => (
                  <ChatHistoryItem
                    key={item.id}
                    item={item}
                    active={item.id === currentSessionId}
                    onPin={pin}
                    onRemove={remove}
                  />
                ))}
                {recent.length > 0 && <Separator className="my-2" />}
              </>
            )}
            {recent.length > 0 && (
              <>
                {pinned.length > 0 && (
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1 py-1">
                    Recent
                  </p>
                )}
                {recent.map((item) => (
                  <ChatHistoryItem
                    key={item.id}
                    item={item}
                    active={item.id === currentSessionId}
                    onPin={pin}
                    onRemove={remove}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function ChatHistoryItem({
  item,
  active,
  onPin,
  onRemove,
}: {
  item: { id: string; title: string; preview: string; createdAt: number; pinned: boolean };
  active: boolean;
  onPin: (id: string, pinned: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group flex items-start gap-2 rounded-md px-2 py-2 cursor-default transition-colors ${
        active ? "bg-primary/10 text-primary" : "hover:bg-accent"
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{item.title}</p>
        {item.preview && (
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{item.preview}</p>
        )}
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {formatDistanceToNow(item.createdAt, { addSuffix: true })}
        </p>
      </div>
      {hovered && (
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => onPin(item.id, !item.pinned)}
            title={item.pinned ? "Unpin" : "Pin"}
          >
            <Pin className={`h-3 w-3 ${item.pinned ? "fill-current" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-destructive hover:text-destructive"
            onClick={() => onRemove(item.id)}
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Right Sidebar: Context Panel (role-based, top half) ─────────────────────

function StudentContextPanel() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["learning-stats"],
    queryFn: getLearningStats,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Progress</p>
      <div className="grid grid-cols-2 gap-2">
        <StatMini
          icon={<Clock className="h-3.5 w-3.5 text-blue-500" />}
          label="Hours"
          value={stats?.total_hours.toFixed(1) ?? "0"}
        />
        <StatMini
          icon={<CheckCircle className="h-3.5 w-3.5 text-green-500" />}
          label="Completed"
          value={String(stats?.completed_lectures ?? 0)}
        />
        <StatMini
          icon={<TrendingUp className="h-3.5 w-3.5 text-orange-500" />}
          label="In Progress"
          value={String(stats?.in_progress_lectures ?? 0)}
        />
        <StatMini
          icon={<BookOpen className="h-3.5 w-3.5 text-purple-500" />}
          label="Streak"
          value={`${stats?.streak_days ?? 0}d`}
        />
      </div>
      {stats?.most_active_course && (
        <div className="rounded-md bg-muted/60 px-2 py-1.5">
          <p className="text-[10px] text-muted-foreground">Most active course</p>
          <p className="text-xs font-medium truncate">{stats.most_active_course}</p>
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs gap-1.5"
        onClick={() => {
          const quizPrompts = [
            "Hãy kiểm tra kiến thức của tôi về môn học gần đây",
            "Quiz tôi về nội dung bài giảng đã học",
            "Tóm tắt những gì tôi đã học được",
          ];
          const prompt = quizPrompts[Math.floor(Math.random() * quizPrompts.length)];
          const event = new CustomEvent("chat:send", { detail: prompt });
          window.dispatchEvent(event);
        }}
      >
        <Bot className="h-3.5 w-3.5" />
        Quiz me
      </Button>
    </div>
  );
}

function TeacherContextPanel() {
  const { data: lectures, isLoading } = useQuery({
    queryKey: ["recent-lectures-context"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/v1/lectures/?limit=5");
      return data as { id: string; title: string; status: string }[];
    },
    staleTime: 60 * 1000,
    refetchInterval: 30 * 1000,
  });

  const STATUS_COLOR: Record<string, string> = {
    COMPLETED: "text-green-600",
    FAILED: "text-red-500",
    PENDING: "text-muted-foreground",
    EMBEDDING: "text-blue-500",
    ASR: "text-blue-500",
    OCR: "text-blue-500",
    SCENE_DETECTING: "text-blue-500",
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent Uploads</p>
      {!lectures || lectures.length === 0 ? (
        <p className="text-xs text-muted-foreground">No lectures yet</p>
      ) : (
        <div className="space-y-1">
          {lectures.map((l) => (
            <Link key={l.id} href={`/lectures/${l.id}`}>
              <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent transition-colors">
                <Video className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <p className="text-xs flex-1 truncate">{l.title}</p>
                <span className={`text-[10px] font-medium shrink-0 ${STATUS_COLOR[l.status] ?? "text-muted-foreground"}`}>
                  {l.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
      <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" asChild>
        <Link href="/upload">
          <Plus className="h-3.5 w-3.5" />
          Upload Video
        </Link>
      </Button>
    </div>
  );
}

function StatMini({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1.5">
      {icon}
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs font-semibold">{value}</p>
      </div>
    </div>
  );
}

// ─── Right Sidebar: Video Watch History (bottom half) ─────────────────────────

function VideoHistoryPanel() {
  const { data: progress, isLoading } = useQuery({
    queryKey: ["my-progress-chat"],
    queryFn: getMyProgress,
    staleTime: 2 * 60 * 1000,
  });

  const inProgress = (progress ?? []).filter((p) => !p.completed && p.percent > 0);
  const completed = (progress ?? []).filter((p) => p.completed);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  const allItems: (LectureProgress & { _type: "progress" | "done" })[] = [
    ...inProgress.map((p) => ({ ...p, _type: "progress" as const })),
    ...completed.slice(0, 5).map((p) => ({ ...p, _type: "done" as const })),
  ];

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Watch History</p>
      {allItems.length === 0 ? (
        <p className="text-xs text-muted-foreground">No watch history yet</p>
      ) : (
        <div className="space-y-1">
          {allItems.map((item) => (
            <Link
              key={item.lecture_id}
              href={`/lectures/${item.lecture_id}?t=${Math.floor(item.last_position_sec)}`}
            >
              <div className="rounded-md px-2 py-1.5 hover:bg-accent transition-colors group">
                <div className="flex items-start gap-1.5">
                  {item._type === "done" ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate group-hover:text-primary">
                      {item.lecture_title}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{item.course_name}</p>
                    {item._type === "progress" && (
                      <Progress value={item.percent} className="h-1 mt-1" />
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {item._type === "done" ? "Done" : `${item.percent}%`}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Chat Message ─────────────────────────────────────────────────────────────

function ChatMessageView({
  message,
}: {
  message: { id: string; role: string; content: string; cards?: ChatCard[]; tool_calls_used?: string[] };
}) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      <div className={`max-w-[80%] space-y-2 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted rounded-bl-sm"
          }`}
        >
          {message.content}
        </div>
        {message.cards?.map((card, i) => <ChatCardView key={i} card={card} />)}
        {message.tool_calls_used && message.tool_calls_used.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {message.tool_calls_used.map((t) => (
              <Badge key={t} variant="outline" className="text-xs py-0 h-5">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </div>
      {isUser && (
        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

// ─── Main Chat Page ───────────────────────────────────────────────────────────

export default function ChatPage() {
  const { user, isTeacherOrAbove, isAuthenticated } = useAuthStore();
  const {
    sessionId, messages,
    setSessionId, addMessage, appendToLastMessage, setLastMessageCitations,
    addCardToLastMessage, clearSession,
  } = useChatStore();
  const { add: addToHistory } = useChatHistoryStore();

  const [input, setInput] = useState("");
  const [activeCitations, setActiveCitations] = useState<Citation[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Init session
  useEffect(() => {
    if (!sessionId && isAuthenticated()) {
      createChatSession({ user_id: user?.id })
        .then((s) => setSessionId(s.id))
        .catch(() => {});
    }
  }, [sessionId, isAuthenticated, user?.id, setSessionId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for quiz prompt from right sidebar
  useEffect(() => {
    const handler = (e: Event) => {
      const prompt = (e as CustomEvent<string>).detail;
      setInput(prompt);
      inputRef.current?.focus();
    };
    window.addEventListener("chat:send", handler);
    return () => window.removeEventListener("chat:send", handler);
  }, []);

  const { send, isConnected, isStreaming } = useWebSocket(sessionId ?? "", {
    onToken: (token) => appendToLastMessage(token),
    onCitations: (citations) => {
      setLastMessageCitations(citations);
      if (citations.length > 0) setActiveCitations(citations);
    },
    onCard: (card) => addCardToLastMessage(card),
    onDone: () => {},
    onToolCall: () => {},
    onError: (err) => toast.error(err),
  });

  const handleNewChat = useCallback(() => {
    // Save current session to history before clearing
    if (sessionId && messages.length > 0) {
      const firstUser = messages.find((m) => m.role === "user");
      const firstAssistant = messages.find((m) => m.role === "assistant");
      addToHistory({
        id: sessionId,
        title: firstUser?.content.slice(0, 60) ?? "Chat",
        preview: firstAssistant?.content.slice(0, 80) ?? "",
        createdAt: Date.now(),
        pinned: false,
      });
    }
    clearSession();
    setActiveCitations([]);
    // Create new session
    if (isAuthenticated()) {
      createChatSession({ user_id: user?.id })
        .then((s) => setSessionId(s.id))
        .catch(() => {});
    }
  }, [sessionId, messages, addToHistory, clearSession, isAuthenticated, user?.id, setSessionId]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isStreaming || !sessionId) return;
    const userMsg = { id: Date.now().toString(), role: "user" as const, content: input.trim() };
    addMessage(userMsg);
    const assistantMsg = { id: (Date.now() + 1).toString(), role: "assistant" as const, content: "" };
    addMessage(assistantMsg);

    send(JSON.stringify({
      content: input.trim(),
      history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    }));
    setInput("");
    inputRef.current?.focus();
  }, [input, isStreaming, sessionId, addMessage, send, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleUploadComplete = useCallback((message: string) => {
    addMessage({ id: Date.now().toString(), role: "assistant" as const, content: message });
  }, [addMessage]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left Sidebar (closable): Chat History ── */}
      {leftOpen && (
        <div className="w-60 border-r shrink-0 flex flex-col overflow-hidden">
          <ChatHistorySidebar
            onClose={() => setLeftOpen(false)}
            currentSessionId={sessionId}
            onNewChat={handleNewChat}
          />
        </div>
      )}

      {/* Toggle button when left sidebar is closed */}
      {!leftOpen && (
        <div className="flex flex-col border-r">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 m-1"
            onClick={() => setLeftOpen(true)}
            title="Open chat history"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ── Center: Chat Messages + Input ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center gap-3">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Giảng Đường Số AI</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Hỏi bất kỳ điều gì về bài giảng, thống kê, hay nội dung học tập
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {[
                  "Thống kê video trong hệ thống",
                  "Tìm bài giảng về machine learning",
                  "Có bao nhiêu môn học?",
                ].map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((msg) => (
                <ChatMessageView key={msg.id} message={msg} />
              ))}
              {isStreaming && (
                <div className="flex gap-3 justify-start">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Citations strip (inline, above input) */}
        {activeCitations.length > 0 && (
          <div className="border-t px-4 py-2 bg-muted/40 flex items-center gap-2 overflow-x-auto shrink-0">
            <span className="text-xs text-muted-foreground shrink-0">Sources:</span>
            {activeCitations.map((c, i) => (
              <Link key={i} href={c.deep_link}>
                <Badge variant="outline" className="text-xs whitespace-nowrap hover:bg-accent cursor-pointer">
                  {c.lecture_title} · {formatTimestamp(c.timestamp_start)}
                </Badge>
              </Link>
            ))}
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0 ml-auto"
              onClick={() => setActiveCitations([])}
            >
              ×
            </Button>
          </div>
        )}

        {/* Input area */}
        <div className="border-t p-4 shrink-0">
          <div className="max-w-3xl mx-auto flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Hỏi về nội dung bài giảng, thống kê..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming || !sessionId}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={isStreaming || !input.trim() || !sessionId}
              size="icon"
            >
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
            {isTeacherOrAbove() && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setUploadOpen(true)}
                title="Upload video bài giảng"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            )}
          </div>
          <ChatUploadDialog
            open={uploadOpen}
            onClose={() => setUploadOpen(false)}
            onUploadComplete={handleUploadComplete}
          />
          {!isConnected && sessionId && (
            <p className="text-xs text-muted-foreground text-center mt-1">Reconnecting...</p>
          )}
        </div>
      </div>

      {/* ── Right Sidebar (always visible): Contextual + History ── */}
      <div className="w-72 border-l flex flex-col shrink-0 overflow-hidden">
        {/* Top half: role-based context */}
        <div className="flex-1 overflow-y-auto p-3 border-b">
          {isTeacherOrAbove() ? <TeacherContextPanel /> : <StudentContextPanel />}
        </div>

        {/* Bottom half: video watch history */}
        <div className="flex-1 overflow-y-auto p-3">
          <VideoHistoryPanel />
        </div>
      </div>
    </div>
  );
}
