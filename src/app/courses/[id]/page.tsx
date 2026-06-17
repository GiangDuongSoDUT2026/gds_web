"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Video, ArrowLeft, Loader2, RefreshCw, ChevronRight, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/badge";
import {
  getChaptersByCourse,
  getLecturesByChapter,
  createChapter,
  reprocessLecture,
  updateChapter,
  deleteChapter,
} from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { formatDuration } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import type { Chapter } from "@/types/api";

const chapterSchema = z.object({
  title: z.string().min(1, "Tên chương không được để trống").max(200),
  order_index: z.coerce.number().int().positive("Phải là số dương"),
});

type ChapterFormValues = z.infer<typeof chapterSchema>;

function AddChapterDialog({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<ChapterFormValues>({
    resolver: zodResolver(chapterSchema),
    defaultValues: { title: "", order_index: 1 },
  });

  const mutation = useMutation({
    mutationFn: (values: ChapterFormValues) =>
      createChapter(courseId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chapters.byCourse(courseId),
      });
      toast.success("Đã tạo chương mới");
      setOpen(false);
      form.reset();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Không thể tạo chương");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" size="sm">
          <Plus className="h-4 w-4" />
          Thêm chương
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm chương</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên chương</FormLabel>
                  <FormControl>
                    <Input placeholder="Chương 1: Giới thiệu" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="order_index"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thứ tự</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="gap-2">
                {mutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Tạo chương
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EditChapterDialog({ chapter, courseId, onClose }: { chapter: Chapter; courseId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm<ChapterFormValues>({
    resolver: zodResolver(chapterSchema),
    defaultValues: { title: chapter.title, order_index: chapter.order_index },
  });
  const mutation = useMutation({
    mutationFn: (values: ChapterFormValues) => updateChapter(chapter.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chapters.byCourse(courseId) });
      toast.success("Đã cập nhật chương");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message ?? "Không thể cập nhật"),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Chỉnh sửa chương</DialogTitle></DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem><FormLabel>Tên chương</FormLabel>
              <FormControl><Input {...field} /></FormControl><FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="order_index" render={({ field }) => (
            <FormItem><FormLabel>Thứ tự</FormLabel>
              <FormControl><Input type="number" min={1} {...field} /></FormControl><FormMessage />
            </FormItem>
          )} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
            <Button type="submit" disabled={mutation.isPending} className="gap-2">
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

const PAGE_SIZE = 10;

function ChapterLectures({
  chapterId,
  courseId,
}: {
  chapterId: string;
  courseId: string;
}) {
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();

  const { data: lectures, isLoading } = useQuery({
    queryKey: queryKeys.lectures.byChapter(chapterId),
    queryFn: () => getLecturesByChapter(chapterId),
  });

  const reprocessMutation = useMutation({
    mutationFn: reprocessLecture,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lectures.byChapter(chapterId) });
      toast.success("Đã gửi yêu cầu xử lý lại");
    },
    onError: (err: Error) => toast.error(err.message ?? "Không thể reprocess"),
  });

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-48 shrink-0 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!lectures || lectures.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        Chưa có bài giảng nào trong chương này.{" "}
        <Link href="/upload" className="text-primary hover:underline">
          Tải lên ngay
        </Link>
      </p>
    );
  }

  const totalPages = Math.ceil(lectures.length / PAGE_SIZE);
  const pageLectures = lectures.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex gap-3 overflow-x-auto pb-1">
        {pageLectures.map((lecture) => {
          const needsReprocess = lecture.status === "FAILED" || lecture.status === "PENDING";
          return (
            <div
              key={lecture.id}
              className="shrink-0 w-52 rounded-lg border bg-card p-3 flex flex-col gap-2"
            >
              <Link href={`/lectures/${lecture.id}?courseId=${courseId}`} className="flex-1 min-w-0 hover:text-primary transition-colors">
                <div className="flex items-start gap-2">
                  <Video className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-sm font-medium line-clamp-2 leading-snug">{lecture.title}</p>
                </div>
                {lecture.duration_sec != null && lecture.duration_sec > 0 && (
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    {formatDuration(lecture.duration_sec)}
                  </p>
                )}
              </Link>
              <div className="flex items-center justify-between gap-1">
                <StatusBadge status={lecture.status} />
                {needsReprocess && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs gap-1"
                    disabled={reprocessMutation.isPending}
                    onClick={() => reprocessMutation.mutate(lecture.id)}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Xử lý lại
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              ‹
            </Button>
            <span className="text-xs text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              ›
            </Button>
          </div>
        )}
        <Link
          href={`/courses/${courseId}/chapters/${chapterId}`}
          className="ml-auto flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Xem tất cả {lectures.length} video
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;
  const [editChapter, setEditChapter] = useState<Chapter | null>(null);
  const { isTeacherOrAbove } = useAuthStore();
  const canManage = isTeacherOrAbove();
  const queryClient = useQueryClient();

  const { data: chapters, isLoading, error } = useQuery({
    queryKey: queryKeys.chapters.byCourse(courseId),
    queryFn: () => getChaptersByCourse(courseId),
    enabled: !!courseId,
  });

  const deleteChapterMutation = useMutation({
    mutationFn: deleteChapter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chapters.byCourse(courseId) });
      toast.success("Đã xóa chương");
    },
    onError: (err: Error) => toast.error(err.message ?? "Không thể xóa"),
  });

  const sortedChapters = chapters
    ? [...chapters].sort((a, b) => a.order_index - b.order_index)
    : [];

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/programs">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Chương trình học
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nội dung môn học</h1>
          <p className="text-muted-foreground">
            {chapters ? `${chapters.length} chương` : "Đang tải..."}
          </p>
        </div>
        <div className="flex gap-2">
          <AddChapterDialog courseId={courseId} />
          <Button asChild size="sm" className="gap-2">
            <Link href="/upload">
              <Plus className="h-4 w-4" />
              Tải lên bài giảng
            </Link>
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          Không tải được danh sách chương. Vui lòng thử lại.
        </div>
      )}

      {!isLoading && sortedChapters.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <p className="font-medium">Chưa có chương nào</p>
          <p className="text-sm text-muted-foreground">
            Thêm chương để tổ chức bài giảng
          </p>
        </div>
      )}

      {sortedChapters.length > 0 && (
        <Accordion type="multiple" className="w-full">
          {sortedChapters.map((chapter) => (
            <AccordionItem key={chapter.id} value={chapter.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left flex-1 min-w-0">
                  <Badge variant="secondary" className="shrink-0">
                    {chapter.order_index}
                  </Badge>
                  <span className="font-medium flex-1 min-w-0 truncate">{chapter.title}</span>
                  <span className="text-xs text-muted-foreground font-normal shrink-0">
                    {chapter.lecture_count} video
                  </span>
                  {canManage && (
                    <div className="flex gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => setEditChapter(chapter)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        disabled={deleteChapterMutation.isPending}
                        onClick={() => { if (confirm(`Xóa chương "${chapter.title}"?`)) deleteChapterMutation.mutate(chapter.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ChapterLectures chapterId={chapter.id} courseId={courseId} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <Dialog open={!!editChapter} onOpenChange={(o) => !o && setEditChapter(null)}>
        {editChapter && <EditChapterDialog chapter={editChapter} courseId={courseId} onClose={() => setEditChapter(null)} />}
      </Dialog>
    </div>
  );
}
