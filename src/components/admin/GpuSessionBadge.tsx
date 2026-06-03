"use client";

import type { AdminGpuSession } from "@/types/api";

interface Props {
  sessions: AdminGpuSession[];
}

export function GpuSessionBadge({ sessions }: Props) {
  const onlineSessions = sessions.filter((s) => s.is_online);
  const isOnline = onlineSessions.length > 0;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-2.5 w-2.5 rounded-full ${
          isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"
        }`}
      />
      <span className="text-sm font-medium">
        {isOnline
          ? `GPU Online (${onlineSessions.length} session${onlineSessions.length > 1 ? "s" : ""})`
          : "GPU Offline"}
      </span>
      {isOnline &&
        onlineSessions.map((s) => (
          <span
            key={s.id}
            className="text-xs text-muted-foreground capitalize"
          >
            [{s.session_type}]
          </span>
        ))}
    </div>
  );
}
