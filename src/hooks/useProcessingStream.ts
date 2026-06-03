"use client";

import { useEffect, useRef, useState } from "react";
import type { ProcessingStreamEvent } from "@/types/api";

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "NOT_FOUND"]);

interface UseProcessingStreamOptions {
  lectureId: string | null;
  enabled?: boolean;
}

export function useProcessingStream({
  lectureId,
  enabled = true,
}: UseProcessingStreamOptions) {
  const [event, setEvent] = useState<ProcessingStreamEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!lectureId || !enabled) return;

    function connect() {
      if (esRef.current) {
        esRef.current.close();
      }

      const url = `/api/v1/lectures/${lectureId}/progress-stream`;
      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (e) => {
        try {
          const data: ProcessingStreamEvent = JSON.parse(e.data);
          setEvent(data);
          // Tự đóng khi terminal
          if (TERMINAL_STATUSES.has(data.status)) {
            es.close();
            esRef.current = null;
          }
        } catch {
          // skip malformed
        }
      };

      es.onerror = () => {
        setError("Connection lost. Retrying...");
        es.close();
        esRef.current = null;
        // Reconnect sau 5s nếu chưa terminal
        setTimeout(() => {
          if (!TERMINAL_STATUSES.has(event?.status ?? "")) {
            connect();
          }
        }, 5000);
      };

      es.addEventListener("open", () => setError(null));
    }

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectureId, enabled]);

  const isTerminal = event ? TERMINAL_STATUSES.has(event.status) : false;

  return { event, error, isTerminal };
}
