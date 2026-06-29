"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { apiClient } from "@/lib/api";
import type { AdminGpuSession, AdminProcessingJob, GpuQueueStats } from "@/types/api";
import { GpuSessionBadge } from "@/components/admin/GpuSessionBadge";
import { GpuQueueTable } from "@/components/admin/GpuQueueTable";
import { KaggleGuide } from "@/components/admin/KaggleGuide";
import { Button } from "@/components/ui/button";

const POLL_INTERVAL_MS = 10_000;
const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { label: "Tất cả", value: "" },
  { label: "Đang chờ GPU", value: "QUEUED_FOR_GPU" },
  { label: "Đang xử lý", value: "IN_PROGRESS" },
  { label: "Hoàn thành", value: "COMPLETED" },
  { label: "Thất bại", value: "FAILED" },
];

// Map status value → all_time key
const STATUS_ALL_TIME_KEYS: Record<string, string[]> = {
  "": [],
  "QUEUED_FOR_GPU": ["QUEUED_FOR_GPU"],
  "IN_PROGRESS": ["RUNNING", "DISPATCHED", "SCENES_READY", "AWAITING_EMBEDDING"],
  "COMPLETED": ["COMPLETED"],
  "FAILED": ["FAILED"],
};

export default function GpuQueuePage() {
  const [jobs, setJobs] = useState<AdminProcessingJob[]>([]);
  const [total, setTotal] = useState(0);
  const [sessions, setSessions] = useState<AdminGpuSession[]>([]);
  const [stats, setStats] = useState<GpuQueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async (resetPage = false) => {
    const currentPage = resetPage ? 1 : page;
    const offset = (currentPage - 1) * PAGE_SIZE;
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (statusFilter) params.set("status", statusFilter);

      const [jobsRes, sessionsRes, statsRes] = await Promise.all([
        apiClient.get<{ total: number; items: AdminProcessingJob[] } | AdminProcessingJob[]>(`/api/v1/admin/gpu-queue?${params}`),
        apiClient.get<AdminGpuSession[]>("/api/v1/admin/gpu-sessions"),
        apiClient.get<GpuQueueStats>("/api/v1/admin/gpu-queue/stats"),
      ]);
      // Support both old flat-array and new {total, items} response shapes
      const rawJobs = jobsRes.data;
      const items = Array.isArray(rawJobs) ? rawJobs : (rawJobs.items ?? []);
      const total = Array.isArray(rawJobs) ? rawJobs.length : (rawJobs.total ?? 0);
      setJobs(items);
      setTotal(total);
      setSessions(Array.isArray(sessionsRes.data) ? sessionsRes.data : []);
      setStats(statsRes.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => fetchData(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchData]);

  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  // Count for each tab from all_time stats
  const allTime = stats?.all_time ?? {};
  const tabCount = (value: string): number => {
    const keys = STATUS_ALL_TIME_KEYS[value];
    if (!keys || keys.length === 0) return Object.values(allTime).reduce((a, b) => a + b, 0);
    return keys.reduce((sum, k) => sum + (allTime[k] ?? 0), 0);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">GPU Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">Quản lý hàng đợi xử lý video AI</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => fetchData()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Session status + Guide */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4 space-y-3">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">GPU Session</p>
          <GpuSessionBadge sessions={sessions} />
        </div>
        <KaggleGuide />
      </div>

      {/* Stats — all time */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {Object.entries(stats.all_time).map(([status, count]) => (
            <div
              key={status}
              className={`rounded-lg border px-3 py-2 text-center cursor-pointer hover:bg-muted/50 transition-colors ${statusFilter === status ? "border-primary bg-primary/5" : ""}`}
              onClick={() => handleFilterChange(status === statusFilter ? "" : status)}
              title={status}
            >
              <p className="text-lg font-bold">{count}</p>
              <p className="text-[10px] text-muted-foreground truncate">{status.replace(/_/g, " ")}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs with counts */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map((opt) => {
          const count = stats ? tabCount(opt.value) : null;
          return (
            <button
              key={opt.value}
              onClick={() => handleFilterChange(opt.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                statusFilter === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              {opt.label}{count !== null ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Đang tải...</div>
      ) : (
        <>
          <GpuQueueTable jobs={jobs} onRefresh={() => fetchData()} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} / {total} jobs
              </p>
              <div className="flex items-center gap-1">
                <Button
                  size="sm" variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 text-sm">{page} / {totalPages}</span>
                <Button
                  size="sm" variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
