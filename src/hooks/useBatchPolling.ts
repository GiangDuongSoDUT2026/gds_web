"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useUploadStore } from "@/store/useUploadStore";
import { apiClient } from "@/lib/api";

export function useBatchPolling() {
  const { batches, updateBatch, markNotified } = useUploadStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const pollActive = async () => {
      const activeBatches = Object.values(batches).filter((b) => !b.is_done);
      if (activeBatches.length === 0) return;

      for (const batch of activeBatches) {
        try {
          const { data } = await apiClient.get(`/api/v1/upload/batches/${batch.batch_id}`);
          updateBatch(batch.batch_id, data);

          if (data.is_done && !batch.notified) {
            markNotified(batch.batch_id);
            if (data.failed === 0) {
              toast.success(`Upload hoàn tất: ${data.succeeded}/${data.total} video xử lý thành công`);
            } else {
              toast.warning(
                `Upload kết thúc: ${data.succeeded} thành công, ${data.failed} thất bại trên ${data.total} video`
              );
            }
            // Notify chat page to send a WS context message
            if (data.succeeded > 0) {
              window.dispatchEvent(
                new CustomEvent("batch:processing-done", {
                  detail: {
                    batch_id: batch.batch_id,
                    succeeded: data.succeeded,
                    failed: data.failed,
                    items: data.items ?? [],
                  },
                })
              );
            }
          }
        } catch {
          // ignore polling errors
        }
      }
    };

    intervalRef.current = setInterval(pollActive, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [batches, updateBatch, markNotified]);
}
