"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, Loader2, Video, Search, Plus, Bot, User as UserIcon, ExternalLink, Paperclip } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChatCardView } from "@/components/chat/StatCard";
import { ChatUploadDialog } from "@/components/chat/ChatUploadDialog";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useChatStore } from "@/store/useChatStore";
import { useAuthStore } from "@/store/useAuthStore";
import { createChatSession } from "@/lib/api";
import { apiClient } from "@/lib/api";
import { formatTimestamp } from "@/lib/utils";
import type { Citation, ChatCard } from "@/types/api";

// ─── Sources Panel (TEACHER+ only) ───────────────────────────────────────────

function SourcesPanel() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: lectures, isLoading } = useQuery({
    queryKey: ["sources-all-lectures"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/v1/lectures/?limit=200");
      return data as { id: string; title: string; status: string; duration_sec: number | null; created_at: string }[];
    },
  });

  const filtered = (lectures ?? []).filter((l) => {
    const matchSearch = l.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const STATUS_COLORS: Record<string, string> = {
    COMPLETED: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
    PENDING: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="flex flex-col h-full gap-3 p-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search lectures..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All status</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" asChild>
          <Link href="/upload">
            <Plus className="h-4 w-4 mr-1" />
            Upload
          </Link>
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Video className="h-10 w-10 mb-2" />
            <p className="text-sm">No lectures found</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((lecture) => (
              <div
                key={lecture.id}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Video className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate font-medium">{lecture.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[lecture.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {lecture.status}
                  </span>
                  <Button size="sm" variant="ghost" asChild className="h-7 w-7 p-0">
                    <Link href={`/lectures/${lecture.id}`}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      <p className="text-xs text-muted-foreground text-right">{filtered.length} lecture(s)</p>
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
        {/* Stat cards */}
        {message.cards?.map((card, i) => <ChatCardView key={i} card={card} />)}
        {/* Tool calls indicator */}
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
    sessionId, messages, isStreaming,
    setSessionId, addMessage, appendToLastMessage, setLastMessageCitations,
    addCardToLastMessage,
  } = useChatStore();

  const [input, setInput] = useState("");
  const [activeCitations, setActiveCitations] = useState<Citation[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
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

  const { send, isConnected } = useWebSocket(sessionId ?? "", {
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

  const handleSend = useCallback(() => {
    if (!input.trim() || isStreaming || !sessionId) return;
    const userMsg = { id: Date.now().toString(), role: "user" as const, content: input.trim() };
    addMessage(userMsg);
    const assistantMsg = { id: (Date.now() + 1).toString(), role: "assistant" as const, content: "" };
    addMessage(assistantMsg);

    send(JSON.stringify({ content: input.trim(), history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })) }));
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
    const aiMsg = {
      id: Date.now().toString(),
      role: "assistant" as const,
      content: message,
    };
    addMessage(aiMsg);
  }, [addMessage]);

  const canSeeSourcesTab = isTeacherOrAbove();

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Tabs defaultValue="chat" className="flex flex-col h-full">
          {/* Tab bar */}
          <div className="border-b px-4 pt-2 shrink-0">
            <TabsList className="h-9">
              <TabsTrigger value="chat" className="text-sm">
                <Bot className="h-3.5 w-3.5 mr-1.5" />
                Chat
              </TabsTrigger>
              {canSeeSourcesTab && (
                <TabsTrigger value="sources" className="text-sm">
                  <Video className="h-3.5 w-3.5 mr-1.5" />
                  Sources
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Chat tab */}
          <TabsContent value="chat" className="flex-1 flex flex-col mt-0 overflow-hidden">
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
                    <ChatMessageView
                      key={msg.id}
                      message={msg}
                    />
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

            {/* Input */}
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
                    type="button"
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
          </TabsContent>

          {/* Sources tab (TEACHER+ only) */}
          {canSeeSourcesTab && (
            <TabsContent value="sources" className="flex-1 mt-0 overflow-hidden">
              <SourcesPanel />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Citations sidebar */}
      {activeCitations.length > 0 && (
        <div className="w-72 border-l flex flex-col shrink-0">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h3 className="text-sm font-semibold">Sources ({activeCitations.length})</h3>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setActiveCitations([])}>
              ×
            </Button>
          </div>
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-2">
              {activeCitations.map((c, i) => (
                <Link
                  key={i}
                  href={c.deep_link}
                  className="block rounded-lg border p-3 hover:bg-accent transition-colors"
                >
                  <p className="text-xs font-medium line-clamp-2">{c.lecture_title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.chapter_title}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {formatTimestamp(c.timestamp_start)} &ndash; {formatTimestamp(c.timestamp_end)}
                  </Badge>
                  {c.keyframe_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.keyframe_url} alt="" className="w-full rounded mt-2 aspect-video object-cover" />
                  )}
                </Link>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
