"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiClient } from "@/lib/api";
import { useNotificationStore } from "@/store/useNotificationStore";
import { Button } from "@/components/ui/button";

export function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotificationStore();
  const [open, setOpen] = useState(false);

  async function handleMarkRead(id: string, refType: string | null, refId: string | null) {
    markRead(id);
    await apiClient.patch(`/api/v1/notifications/${id}/read`).catch(() => {});
    setOpen(false);
    if (refType === "lecture" && refId) {
      router.push(`/lectures/${refId}`);
    }
  }

  async function handleMarkAllRead() {
    markAllRead();
    await apiClient.post("/api/v1/notifications/read-all").catch(() => {});
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative h-8 w-8"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div className="absolute right-0 top-10 z-50 w-80 rounded-lg border bg-background shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm font-semibold">Thông báo</span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Đánh dấu tất cả đã đọc
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Không có thông báo
              </div>
            ) : (
              <ul className="max-h-96 overflow-y-auto divide-y">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => handleMarkRead(n.id, n.ref_type, n.ref_id)}
                    className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-accent transition-colors ${
                      !n.is_read ? "bg-accent/40" : ""
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {n.type === "processing_done" ? (
                        <span className="flex h-2 w-2 rounded-full bg-green-500" />
                      ) : n.type === "processing_failed" ? (
                        <span className="flex h-2 w-2 rounded-full bg-destructive" />
                      ) : (
                        <span className="flex h-2 w-2 rounded-full bg-yellow-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.body}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(n.created_at).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span className="mt-1 shrink-0 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
