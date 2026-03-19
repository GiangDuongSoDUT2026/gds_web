"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useQuery } from "@tanstack/react-query";
import { Upload, X, FileVideo, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getPrograms, getCoursesByProgram, getChaptersByCourse, chatUpload } from "@/lib/api";
import { useUploadStore } from "@/store/useUploadStore";

const ACCEPTED_TYPES = {
  "video/mp4": [".mp4"],
  "video/quicktime": [".mov"],
  "video/x-msvideo": [".avi"],
  "video/webm": [".webm"],
  "video/mpeg": [".mpeg", ".mpg"],
  "video/x-matroska": [".mkv"],
};

interface Props {
  open: boolean;
  onClose: () => void;
  onUploadComplete: (message: string) => void;
}

export function ChatUploadDialog({ open, onClose, onUploadComplete }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [programId, setProgramId] = useState<string>("");
  const [courseId, setCourseId] = useState<string>("");
  const [chapterId, setChapterId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { addBatch } = useUploadStore();

  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: getPrograms,
    enabled: open,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses", programId],
    queryFn: () => getCoursesByProgram(programId),
    enabled: !!programId,
  });

  const { data: chapters = [] } = useQuery({
    queryKey: ["chapters", courseId],
    queryFn: () => getChaptersByCourse(courseId),
    enabled: !!courseId,
  });

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => {
      const merged = [...prev, ...accepted];
      if (merged.length > 10) {
        toast.warning("Tối đa 10 video mỗi lần, đã bỏ bớt");
        return merged.slice(0, 10);
      }
      return merged;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 10,
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!chapterId) { toast.error("Vui lòng chọn chương"); return; }
    if (files.length === 0) { toast.error("Chưa chọn video nào"); return; }

    setUploading(true);
    setProgress(0);
    try {
      const result = await chatUpload(files, chapterId, setProgress);

      // Register batch for polling
      addBatch({
        batch_id: result.batch_id,
        total: result.total,
        succeeded: 0,
        failed: result.rejected,
        processing: result.accepted,
        status: "PROCESSING",
        items: [],
        is_done: false,
      });

      onUploadComplete(result.message);
      onClose();
      setFiles([]);
      setProgramId(""); setCourseId(""); setChapterId("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload thất bại");
    } finally {
      setUploading(false);
    }
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload bài giảng qua Chat
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cascade: Program → Course → Chapter */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Chọn vị trí lưu *
            </Label>
            <Select value={programId} onValueChange={(v) => { setProgramId(v); setCourseId(""); setChapterId(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn chương trình..." />
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {programId && (
              <Select value={courseId} onValueChange={(v) => { setCourseId(v); setChapterId(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn môn học..." />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {courseId && (
              <Select value={chapterId} onValueChange={setChapterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn chương..." />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>{ch.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"}`}
          >
            <input {...getInputProps()} />
            <FileVideo className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isDragActive
                ? "Thả video vào đây..."
                : "Kéo thả hoặc click để chọn video (tối đa 10 file)"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              MP4, MOV, AVI, WebM, MKV — tối đa 10 GB/file
            </p>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{files.length} file ({formatSize(totalSize)})</span>
                <button onClick={() => setFiles([])} className="text-destructive hover:underline">Xóa tất cả</button>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 rounded border px-2 py-1.5 text-xs">
                    <FileVideo className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="text-muted-foreground shrink-0">{formatSize(file.size)}</span>
                    <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload progress */}
          {uploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Đang upload...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={uploading}>Hủy</Button>
          <Button
            onClick={handleUpload}
            disabled={uploading || files.length === 0 || !chapterId}
          >
            {uploading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang upload...</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" />Upload {files.length > 0 ? `${files.length} video` : ""}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
