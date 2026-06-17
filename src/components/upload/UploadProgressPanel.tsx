"use client";

import { useUploadStore } from "@/store/useUploadStore";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function UploadProgressPanel() {
  const { activeUploads, removeActiveUpload } = useUploadStore();
  const uploads = Object.values(activeUploads);

  if (uploads.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
      {uploads.map((u) => (
        <div
          key={u.id}
          className={cn(
            "rounded-lg border bg-background shadow-lg px-4 py-3 space-y-2",
            u.status === "error" && "border-destructive/50"
          )}
        >
          <div className="flex items-start gap-2">
            <div className="mt-0.5 shrink-0">
              {u.status === "uploading" && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              {u.status === "done" && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
              {u.status === "error" && (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{u.filename}</p>
              {u.status === "uploading" && (
                <p className="text-xs text-muted-foreground">{u.progress}%</p>
              )}
              {u.status === "done" && (
                <p className="text-xs text-green-600">Upload hoàn tất</p>
              )}
              {u.status === "error" && (
                <p className="text-xs text-destructive truncate">{u.error ?? "Upload thất bại"}</p>
              )}
            </div>

            {u.status !== "uploading" && (
              <button
                onClick={() => removeActiveUpload(u.id)}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {u.status === "uploading" && (
            <Progress value={u.progress} className="h-1.5" />
          )}
        </div>
      ))}
    </div>
  );
}
