import { create } from "zustand";

export interface UploadBatchItem {
  lecture_id?: string;
  task_id?: string;
  filename: string;
  status: string;
  error?: string;
}

export interface UploadBatch {
  batch_id: string;
  total: number;
  succeeded: number;
  failed: number;
  processing: number;
  status: "PROCESSING" | "COMPLETED" | "PARTIAL";
  items: UploadBatchItem[];
  is_done: boolean;
  notified: boolean;
}

export interface ActiveUpload {
  id: string;
  filename: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

interface UploadStore {
  batches: Record<string, UploadBatch>;
  activeUploads: Record<string, ActiveUpload>;
  addBatch: (batch: Omit<UploadBatch, "notified">) => void;
  updateBatch: (batch_id: string, data: Partial<UploadBatch>) => void;
  markNotified: (batch_id: string) => void;
  activeBatches: () => UploadBatch[];
  addActiveUpload: (upload: ActiveUpload) => void;
  updateActiveUpload: (id: string, data: Partial<ActiveUpload>) => void;
  removeActiveUpload: (id: string) => void;
}

export const useUploadStore = create<UploadStore>((set, get) => ({
  batches: {},
  activeUploads: {},
  addBatch: (batch) =>
    set((s) => ({ batches: { ...s.batches, [batch.batch_id]: { ...batch, notified: false } } })),
  updateBatch: (batch_id, data) =>
    set((s) => ({
      batches: {
        ...s.batches,
        [batch_id]: { ...s.batches[batch_id], ...data },
      },
    })),
  markNotified: (batch_id) =>
    set((s) => ({
      batches: {
        ...s.batches,
        [batch_id]: { ...s.batches[batch_id], notified: true },
      },
    })),
  activeBatches: () => Object.values(get().batches).filter((b) => !b.is_done || !b.notified),
  addActiveUpload: (upload) =>
    set((s) => ({ activeUploads: { ...s.activeUploads, [upload.id]: upload } })),
  updateActiveUpload: (id, data) =>
    set((s) => ({
      activeUploads: { ...s.activeUploads, [id]: { ...s.activeUploads[id], ...data } },
    })),
  removeActiveUpload: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.activeUploads;
      return { activeUploads: rest };
    }),
}));
