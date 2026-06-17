"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LectureCard } from "@/components/lecture/LectureCard";
import { useAuthStore } from "@/store/useAuthStore";
import { getLecturesByChapter, getChaptersByCourse, reprocessLecture, updateLecture, deleteLecture } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { LectureVideo } from "@/types/api";

export default function ChapterDetailPage() {
  const params = useParams<{ id: string; chapterId: string }>();
  const courseId = params.id;
  const chapterId = params.chapterId;
  const queryClient = useQueryClient();
  const { isTeacherOrAbove } = useAuthStore();
  const canManage = isTeacherOrAbove();
  const [editingLecture, setEditingLecture] = useState<LectureVideo | null>(null);
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
      setEditingLecture(null);
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="aspect-video w-full rounded-lg" />
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

      {/* Edit title inline dialog */}
      {editingLecture && (
        <div className="flex items-center gap-2 p-3 rounded-md border bg-muted">
          <span className="text-sm text-muted-foreground shrink-0">Đổi tên:</span>
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="h-8 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") updateMutation.mutate({ id: editingLecture.id, title: editTitle });
              if (e.key === "Escape") setEditingLecture(null);
            }}
          />
          <Button size="sm" className="h-8 text-xs shrink-0" disabled={updateMutation.isPending}
            onClick={() => updateMutation.mutate({ id: editingLecture.id, title: editTitle })}>
            {updateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Lưu"}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs shrink-0" onClick={() => setEditingLecture(null)}>Hủy</Button>
        </div>
      )}

      {lectures && lectures.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {lectures.map((lecture) => (
            <LectureCard
              key={lecture.id}
              lecture={lecture}
              courseId={courseId}
              canManage={canManage}
              isReprocessing={reprocessMutation.isPending}
              isDeleting={deleteMutation.isPending}
              onReprocess={(id) => reprocessMutation.mutate(id)}
              onEdit={(lec) => { setEditingLecture(lec); setEditTitle(lec.title); }}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
