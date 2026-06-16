"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Video, RefreshCw, Pencil, Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/useAuthStore";
import { getLecturesByChapter, getChaptersByCourse, reprocessLecture, updateLecture, deleteLecture } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { formatDuration } from "@/lib/utils";

export default function ChapterDetailPage() {
  const params = useParams<{ id: string; chapterId: string }>();
  const courseId = params.id;
  const chapterId = params.chapterId;
  const queryClient = useQueryClient();
  const { isTeacherOrAbove } = useAuthStore();
  const canManage = isTeacherOrAbove();
  const [editingLectureId, setEditingLectureId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const { data: chapters } = useQuery({
    queryKey: queryKeys.chapters.byCourse(courseId),
    queryFn: () => getChaptersByCourse(courseId),
    enabled: !!courseId,
  });

  const { data: lectures, isLoading } = useQuery({
    queryKey: queryKeys.lectures.byChapter(chapterId),
    queryFn: () => getLecturesByChapter(chapterId),
    enabled: !!chapterId,
  });

  const reprocessMutation = useMutation({
    mutationFn: reprocessLecture,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lectures.byChapter(chapterId) });
      toast.success("Đã gửi yêu cầu xử lý lại");
    },
    onError: (err: Error) => toast.error(err.message ?? "Không thể reprocess"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => updateLecture(id, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lectures.byChapter(chapterId) });
      toast.success("Đã cập nhật tên bài giảng");
      setEditingLectureId(null);
    },
    onError: (err: Error) => toast.error(err.message ?? "Không thể cập nhật"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLecture,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lectures.byChapter(chapterId) });
      toast.success("Đã xóa bài giảng");
    },
    onError: (err: Error) => toast.error(err.message ?? "Không thể xóa"),
  });

  const chapter = chapters?.find((c) => c.id === chapterId);

  const completed = lectures?.filter((l) => l.status === "COMPLETED").length ?? 0;
  const processing = lectures?.filter((l) => l.status === "PROCESSING").length ?? 0;
  const failed = lectures?.filter((l) => l.status === "FAILED").length ?? 0;

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/courses/${courseId}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Nội dung môn học
          </Link>
        </Button>
      </div>

      <div>
        <div className="flex items-center gap-3">
          {chapter && (
            <Badge variant="secondary" className="shrink-0">
              {chapter.order_index}
            </Badge>
          )}
          <h1 className="text-2xl font-bold">
            {chapter?.title ?? "Đang tải..."}
          </h1>
        </div>
        {lectures && (
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span>{lectures.length} video</span>
            {completed > 0 && <span className="text-green-600">{completed} hoàn thành</span>}
            {processing > 0 && <span className="text-blue-600">{processing} đang xử lý</span>}
            {failed > 0 && <span className="text-destructive">{failed} lỗi</span>}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {!isLoading && lectures && lectures.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <p className="font-medium">Chưa có video nào</p>
          <Button asChild variant="outline" className="mt-4" size="sm">
            <Link href="/upload">Tải lên ngay</Link>
          </Button>
        </div>
      )}

      {lectures && lectures.length > 0 && (
        <div className="space-y-2">
          {lectures.map((lecture) => {
            const needsReprocess = lecture.status === "FAILED" || lecture.status === "PENDING";
            const isEditing = editingLectureId === lecture.id;
            return (
              <div
                key={lecture.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                {isEditing ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-7 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") updateMutation.mutate({ id: lecture.id, title: editTitle });
                        if (e.key === "Escape") setEditingLectureId(null);
                      }}
                    />
                    <Button size="sm" className="h-7 text-xs" disabled={updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ id: lecture.id, title: editTitle })}>
                      {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Lưu"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingLectureId(null)}>Hủy</Button>
                  </div>
                ) : (
                  <Link
                    href={`/lectures/${lecture.id}?courseId=${courseId}`}
                    className="flex items-center gap-2 min-w-0 flex-1 hover:text-primary transition-colors"
                  >
                    <Video className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{lecture.title}</p>
                      {lecture.duration_sec != null && lecture.duration_sec > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(lecture.duration_sec)}
                          {lecture.scenes.length > 0 && ` · ${lecture.scenes.length} cảnh`}
                        </p>
                      )}
                    </div>
                  </Link>
                )}
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={lecture.status} />
                  {needsReprocess && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      disabled={reprocessMutation.isPending}
                      onClick={() => reprocessMutation.mutate(lecture.id)}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Xử lý lại
                    </Button>
                  )}
                  {canManage && !isEditing && (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => { setEditingLectureId(lecture.id); setEditTitle(lecture.title); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        disabled={deleteMutation.isPending}
                        onClick={() => { if (confirm(`Xóa "${lecture.title}"?`)) deleteMutation.mutate(lecture.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
