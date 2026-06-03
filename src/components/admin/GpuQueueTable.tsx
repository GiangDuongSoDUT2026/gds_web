"use client";

import { apiClient } from "@/lib/api";
import type { AdminProcessingJob } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-800",
  QUEUED_FOR_GPU: "bg-yellow-100 text-yellow-800",
  DISPATCHED: "bg-blue-100 text-blue-800",
  RUNNING: "bg-indigo-100 text-indigo-800",
  COMPLETED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};

interface Props {
  jobs: AdminProcessingJob[];
  onRefresh: () => void;
}

export function GpuQueueTable({ jobs, onRefresh }: Props) {
  async function handleRetry(jobId: string) {
    await apiClient.post(`/api/v1/admin/gpu-queue/${jobId}/retry`);
    onRefresh();
  }

  async function handleCancel(jobId: string) {
    if (!confirm("Hủy job này?")) return;
    await apiClient.post(`/api/v1/admin/gpu-queue/${jobId}/cancel`);
    onRefresh();
  }

  if (jobs.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Không có jobs nào
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left">
            <th className="px-4 py-3 font-medium">Bài giảng</th>
            <th className="px-4 py-3 font-medium">Trạng thái</th>
            <th className="px-4 py-3 font-medium">Tiến độ</th>
            <th className="px-4 py-3 font-medium">Stage</th>
            <th className="px-4 py-3 font-medium">Tạo lúc</th>
            <th className="px-4 py-3 font-medium">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {jobs.map((job) => (
            <tr key={job.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 max-w-[200px] truncate">
                {job.lecture_title ?? job.lecture_id.slice(0, 8) + "…"}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    STATUS_COLORS[job.status] ?? ""
                  }`}
                >
                  {job.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${job.progress_pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {job.progress_pct}%
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {job.current_stage ?? "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                {new Date(job.created_at).toLocaleString("vi-VN")}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  {job.status === "FAILED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleRetry(job.id)}
                    >
                      Retry
                    </Button>
                  )}
                  {!["COMPLETED", "FAILED"].includes(job.status) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleCancel(job.id)}
                    >
                      Hủy
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
