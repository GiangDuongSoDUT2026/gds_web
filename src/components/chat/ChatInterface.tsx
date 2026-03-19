"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Send, Wifi, WifiOff, Loader2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CitationCard } from "@/components/chat/CitationCard";
import { useChatStore } from "@/store/useChatStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { Citation } from "@/types/api";
import { cn } from "@/lib/utils";
import { nanoid } from "@/lib/nanoid";

interface ChatInterfaceProps {
  sessionId: string;
}

export function ChatInterface({ sessionId }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    isStreaming,
    addMessage,
    appendToLastMessage,
    setLastMessageCitations,
    setIsStreaming,
  } = useChatStore();

  const handleToken = useCallback(
    (token: string) => {
      appendToLastMessage(token);
    },
    [appendToLastMessage]
  );

  const handleDone = useCallback(() => {
    setIsStreaming(false);
    setActiveTools([]);
  }, [setIsStreaming]);

  const handleCitations = useCallback(
    (citations: Citation[]) => {
      setLastMessageCitations(citations);
    },
    [setLastMessageCitations]
  );

  const handleToolCall = useCallback((tool: string) => {
    setActiveTools((prev) =>
      prev.includes(tool) ? prev : [...prev, tool]
    );
  }, []);

  const { send, isConnected, reconnect } = useWebSocket({
    sessionId,
    onToken: handleToken,
    onDone: handleDone,
    onCitations: handleCitations,
    onToolCall: handleToolCall,
  });

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleSend = useCallback(() => {
    const content = input.trim();
    if (!content || isStreaming || !isConnected) return;

    // Add user message
    addMessage({
      id: nanoid(),
      role: "user",
      content,
    });

    // Add empty assistant message to stream into
    addMessage({
      id: nanoid(),
      role: "assistant",
      content: "",
    });

    setIsStreaming(true);
    send(content);
    setInput("");
    textareaRef.current?.focus();
  }, [input, isStreaming, isConnected, addMessage, setIsStreaming, send]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Connection status bar */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2 text-sm">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-destructive" />
              <span className="text-muted-foreground">Disconnected</span>
              <Button
                variant="outline"
                size="sm"
                onClick={reconnect}
                className="h-7 text-xs"
              >
                Reconnect
              </Button>
            </>
          )}
        </div>
        {activeTools.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <Wrench className="h-3 w-3" />
            {activeTools.join(", ")}
          </div>
        )}
      </div>

      {/* Message list */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground">
                Ask anything about your lecture content.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                I can search transcripts, slides, and visual content.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col gap-2",
                msg.role === "user" ? "items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-4 py-3 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {msg.content || (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Thinking...
                  </span>
                )}
              </div>

              {/* Tool usage indicators */}
              {msg.role === "assistant" && msg.tool_calls_used && msg.tool_calls_used.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {msg.tool_calls_used.map((tool) => (
                    <Badge key={tool} variant="outline" className="gap-1 text-xs">
                      <Wrench className="h-3 w-3" />
                      {tool}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Citations */}
              {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                <div className="w-full space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Sources:
                  </p>
                  <div className="space-y-2">
                    {msg.citations.map((citation, i) => (
                      <CitationCard
                        key={i}
                        citation={citation}
                        index={i}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about lecture content... (Enter to send, Shift+Enter for newline)"
            className="min-h-[80px] resize-none"
            disabled={!isConnected || isStreaming}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || !isConnected || isStreaming}
            size="icon"
            className="h-auto shrink-0 self-end"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Enter to send &bull; Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
