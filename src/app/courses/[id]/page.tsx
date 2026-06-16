"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Video, ArrowLeft, Loader2 } from "lucide-react";

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
} from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { formatDuration } from "@/lib/utils";

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

function ChapterLectures({ chapterId }: { chapterId: string }) {
  const { data: lectures, isLoading } = useQuery({
    queryKey: queryKeys.lectures.byChapter(chapterId),
    queryFn: () => getLecturesByChapter(chapterId),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
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

  return (
    <div className="space-y-2">
      {lectures.map((lecture) => (
        <Link
          key={lecture.id}
          href={`/lectures/${lecture.id}`}
          className="flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-accent transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Video className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium line-clamp-1">{lecture.title}</p>
              {lecture.duration_sec != null && lecture.duration_sec > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatDuration(lecture.duration_sec)} &bull;{" "}
                  {lecture.scenes.length} cảnh
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={lecture.status} />
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;

  const { data: chapters, isLoading, error } = useQuery({
    queryKey: queryKeys.chapters.byCourse(courseId),
    queryFn: () => getChaptersByCourse(courseId),
    enabled: !!courseId,
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
                <div className="flex items-center gap-3 text-left">
                  <Badge variant="secondary" className="shrink-0">
                    {chapter.order_index}
                  </Badge>
                  <span className="font-medium">{chapter.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ChapterLectures chapterId={chapter.id} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
