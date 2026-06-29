"use client";

import type { AdminGpuSession } from "@/types/api";

interface Props {
  sessions: AdminGpuSession[];
}

export function GpuSessionBadge({ sessions }: Props) {
  const onlineSessions = sessions.filter((s) => s.is_online);
  const isOnline = onlineSessions.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-2.5 w-2.5 shrink-0 rounded-full ${
            isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"
          }`}
        />
        <span className="text-sm font-medium whitespace-nowrap">
          {isOnline
            ? `GPU Online (${onlineSessions.length} sessions)`
            : "GPU Offline"}
        </span>
      </div>
      {isOnline && (
        <div className="flex flex-wrap gap-1.5 pl-4">
          {onlineSessions.map((s) => (
            <span
              key={s.id}
              className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded capitalize"
            >
              {s.session_type}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
