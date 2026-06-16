"use client";

import { useEffect, useRef } from "react";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import type { Notification } from "@/types/api";

const POLL_INTERVAL_MS = 30_000;

export function useNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const setNotifications = useNotificationStore((s) => s.setNotifications);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchNotifications() {
    try {
      const res = await apiClient.get<Notification[]>(
        "/api/v1/notifications?unread_only=false&limit=20"
      );
      setNotifications(res.data);
    } catch {
      // silent — não bloquear UI
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchNotifications();
    timerRef.current = setInterval(fetchNotifications, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
}
