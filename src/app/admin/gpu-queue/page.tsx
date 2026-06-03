"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { apiClient } from "@/lib/api";
import type {
  AdminGpuSession,
  AdminProcessingJob,
  GpuQueueStats,
} from "@/types/api";
import { GpuSessionBadge } from "@/components/admin/GpuSessionBadge";
import { GpuQueueTable } from "@/components/admin/GpuQueueTable";
import { KaggleGuide } from "@/components/admin/KaggleGuide";
import { Button } from "@/components/ui/button";

const POLL_INTERVAL_MS = 10_000;

export default function GpuQueuePage() {
  const [jobs, setJobs] = useState<AdminProcessingJob[]>([]);
  const [sessions, setSessions] = useState<AdminGpuSession[]>([]);
  const [stats, setStats] = useState<GpuQueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const fetchData = useCallback(async () => {
    try {
      const [jobsRes, sessionsRes, statsRes] = await Promise.all([
        apiClient.get<AdminProcessingJob[]>(
          `/api/v1/admin/gpu-queue${statusFilter ? `?status=${statusFilter}` : ""}`
        ),
        apiClient.get<AdminGpuSession[]>("/api/v1/admin/gpu-sessions"),
        apiClient.get<GpuQueueStats>("/api/v1/admin/gpu-queue/stats"),
      ]);
      setJobs(jobsRes.data);
      setSessions(sessionsRes.data);
      setStats(statsRes.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchData]);

  const STATUS_OPTIONS = [
    { label: "Tất cả", value: "" },
    { label: "Đang chờ GPU", value: "QUEUED_FOR_GPU" },
    { label: "Đang xử lý", value: "RUNNING" },
    { label: "Hoàn thành", value: "COMPLETED" },
    { label: "Thất bại", value: "FAILED" },
  ];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">GPU Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quản lý hàng đợi xử lý video AI
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchData}
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Session status + Guide */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4 space-y-3">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            GPU Session
          </p>
          <GpuSessionBadge sessions={sessions} />
        </div>
        <KaggleGuide />
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {Object.entries(stats.today).map(([status, count]) => (
            <div
              key={status}
              className="rounded-lg border px-3 py-2 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setStatusFilter(status === statusFilter ? "" : status)}
            >
              <p className="text-lg font-bold">{count}</p>
              <p className="text-xs text-muted-foreground truncate">{status}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              statusFilter === opt.value
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-muted"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Đang tải...
        </div>
      ) : (
        <GpuQueueTable jobs={jobs} onRefresh={fetchData} />
      )}
    </div>
  );
}
