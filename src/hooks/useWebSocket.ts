"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatCard, Citation, WsMessage } from "@/types/api";
import { useAuthStore } from "@/store/useAuthStore";

const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_BASE_URL ?? "ws://localhost:80";

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

export interface UseWebSocketOptions {
  sessionId: string | null;
  onToken?: (token: string) => void;
  onDone?: () => void;
  onCitations?: (citations: Citation[]) => void;
  onCard?: (card: ChatCard) => void;
  onToolCall?: (tool: string) => void;
  onError?: (message: string) => void;
}

export interface UseWebSocketResult {
  send: (content: string) => void;
  isConnected: boolean;
  isStreaming: boolean;
  reconnect: () => void;
}

export function useWebSocket(
  sessionIdOrOptions: string | UseWebSocketOptions,
  callbackOptions?: Omit<UseWebSocketOptions, "sessionId">
): UseWebSocketResult {
  // Support both call signatures:
  //   useWebSocket(sessionId, { onToken, onDone, ... })
  //   useWebSocket({ sessionId, onToken, onDone, ... })
  let sessionId: string | null;
  let onToken: ((token: string) => void) | undefined;
  let onDone: (() => void) | undefined;
  let onCitations: ((citations: Citation[]) => void) | undefined;
  let onCard: ((card: ChatCard) => void) | undefined;
  let onToolCall: ((tool: string) => void) | undefined;
  let onError: ((message: string) => void) | undefined;

  if (typeof sessionIdOrOptions === "string" || sessionIdOrOptions === null) {
    sessionId = sessionIdOrOptions as string | null;
    onToken = callbackOptions?.onToken;
    onDone = callbackOptions?.onDone;
    onCitations = callbackOptions?.onCitations;
    onCard = callbackOptions?.onCard;
    onToolCall = callbackOptions?.onToolCall;
    onError = callbackOptions?.onError;
  } else {
    const opts = sessionIdOrOptions as UseWebSocketOptions;
    sessionId = opts.sessionId;
    onToken = opts.onToken;
    onDone = opts.onDone;
    onCitations = opts.onCitations;
    onCard = opts.onCard;
    onToolCall = opts.onToolCall;
    onError = opts.onError;
  }

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isManualClose = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const { accessToken } = useAuthStore();

  const connect = useCallback(() => {
    if (!sessionId) return;

    const tokenParam = accessToken ? `?token=${encodeURIComponent(accessToken)}` : "";
    const url = `${WS_BASE_URL}/chat/ws/chat/${sessionId}${tokenParam}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      let msg: WsMessage;
      try {
        msg = JSON.parse(event.data) as WsMessage;
      } catch {
        return;
      }

      switch (msg.type) {
        case "token":
          setIsStreaming(true);
          onToken?.(msg.content);
          break;
        case "done":
          setIsStreaming(false);
          onDone?.();
          break;
        case "citations":
          onCitations?.(msg.citations);
          break;
        case "card":
          onCard?.(msg.data);
          break;
        case "tool_call":
          onToolCall?.(msg.tool);
          break;
        case "error":
          setIsStreaming(false);
          onError?.(msg.message);
          break;
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsStreaming(false);
      wsRef.current = null;

      if (isManualClose.current) return;

      const attempts = reconnectAttemptsRef.current;
      if (attempts >= MAX_RECONNECT_ATTEMPTS) return;

      const delay = Math.min(
        BASE_RECONNECT_DELAY_MS * Math.pow(2, attempts),
        MAX_RECONNECT_DELAY_MS
      );
      reconnectAttemptsRef.current = attempts + 1;

      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    ws.onerror = () => {
      // onclose will fire after onerror, triggering reconnect
    };
  }, [sessionId, accessToken, onToken, onDone, onCitations, onCard, onToolCall, onError]);

  useEffect(() => {
    if (!sessionId) return;

    isManualClose.current = false;
    connect();

    return () => {
      isManualClose.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, [sessionId, connect]);

  const send = useCallback((content: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    setIsStreaming(true);
    ws.send(JSON.stringify({ content, role: "user" }));
  }, []);

  const reconnect = useCallback(() => {
    isManualClose.current = false;
    reconnectAttemptsRef.current = 0;
    wsRef.current?.close();
    connect();
  }, [connect]);

  return { send, isConnected, isStreaming, reconnect };
}
