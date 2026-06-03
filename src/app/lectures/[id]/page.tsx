"use client";

import { Suspense, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProcessingStatus } from "@/components/lecture/ProcessingStatus";
import { LecturePlayer } from "@/components/lecture/LecturePlayer";
import { SceneTimeline } from "@/components/lecture/SceneTimeline";
import { getLecture } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { usePlayerStore } from "@/store/usePlayerStore";
import { formatTimestamp, formatDuration } from "@/lib/utils";
import type { Scene } from "@/types/api";

// Separated component so useSearchParams can be wrapped in Suspense
function LectureContent({ lectureId }: { lectureId: string }) {
  const searchParams = useSearchParams();
  const initialTimestamp = Number(searchParams.get("t") ?? 0);

  const { data: lecture, isLoading, error } = useQuery({
    queryKey: queryKeys.lectures.detail(lectureId),
    queryFn: () => getLecture(lectureId),
    enabled: !!lectureId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || status === "COMPLETED" || status === "FAILED") return false;
      return 5_000;
    },
  });

  const { currentTimestamp, seekTo } = usePlayerStore();
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);

  const handleSceneClick = useCallback(
    (scene: Scene) => {
      setSelectedScene(scene);
      seekTo(scene.timestamp_start);
    },
    [seekTo]
  );

  const activeScene =
    selectedScene ??
    (lecture?.scenes
      ? [...lecture.scenes]
          .reverse()
          .find((s) => s.timestamp_start <= currentTimestamp) ??
        lecture.scenes[0]
      : null);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <Skeleton className="aspect-video w-full rounded-lg" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !lecture) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          Không tải được bài giảng. Vui lòng kiểm tra kết nối đến server.
        </div>
        <Button asChild variant="ghost" className="mt-4">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Về trang chủ
          </Link>
        </Button>
      </div>
    );
  }

  const isProcessing = lecture.status !== "COMPLETED" && lecture.status !== "FAILED";

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Quay lại
            </Link>
          </Button>
        </div>
        <StatusBadge status={lecture.status} />
      </div>

      <div>
        <h1 className="text-xl font-bold line-clamp-2">{lecture.title}</h1>
        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
          {lecture.duration_sec != null && lecture.duration_sec > 0 && (
            <span>{formatDuration(lecture.duration_sec)}</span>
          )}
          {lecture.scenes.length > 0 && (
            <>
              <span>&bull;</span>
              <span>{lecture.scenes.length} cảnh</span>
            </>
          )}
          {lecture.fps != null && lecture.fps > 0 && (
            <>
              <span>&bull;</span>
              <span>{lecture.fps} fps</span>
            </>
          )}
        </div>
      </div>

      {isProcessing && (
        <ProcessingStatus taskId={lectureId} lectureId={lectureId} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Player + Timeline */}
        <div className="lg:col-span-3 space-y-4">
          <LecturePlayer
            videoUrl={lecture.video_url ?? ""}
            initialTimestamp={initialTimestamp}
            lectureId={lectureId}
          />

          {lecture.scenes.length > 0 && (
            <SceneTimeline
              scenes={lecture.scenes}
              currentTimestamp={currentTimestamp}
              onSceneClick={handleSceneClick}
            />
          )}
        </div>

        {/* Right: Scene detail */}
        <div className="lg:col-span-2">
          {activeScene ? (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
                {activeScene.keyframe_url ? (
                  <Image
                    src={activeScene.keyframe_url}
                    alt={`Scene ${activeScene.shot_index}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <BookOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  Cảnh {activeScene.shot_index + 1}
                </span>
                <Badge variant="outline" className="text-xs">
                  {formatTimestamp(activeScene.timestamp_start)} &ndash;{" "}
                  {formatTimestamp(activeScene.timestamp_end)}
                </Badge>
              </div>

              <Separator />

              <Tabs defaultValue="transcript">
                <TabsList className="w-full">
                  <TabsTrigger value="transcript" className="flex-1">
                    Transcript
                  </TabsTrigger>
                  <TabsTrigger value="ocr" className="flex-1">
                    Slide Text
                  </TabsTrigger>
                  <TabsTrigger value="tags" className="flex-1">
                    Tags
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="transcript">
                  <ScrollArea className="h-48">
                    {activeScene.transcript ? (
                      <p className="text-sm leading-relaxed">
                        {activeScene.transcript}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Không có transcript cho cảnh này
                      </p>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="ocr">
                  <ScrollArea className="h-48">
                    {activeScene.ocr_text ? (
                      <p className="text-sm font-mono leading-relaxed whitespace-pre-wrap">
                        {activeScene.ocr_text}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Không phát hiện text trên slide
                      </p>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="tags">
                  <div className="flex flex-wrap gap-2 pt-1">
                    {activeScene.visual_tags && activeScene.visual_tags.length > 0 ? (
                      activeScene.visual_tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          <Tag className="h-3 w-3" />
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Không có visual tags
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Chọn một cảnh trong timeline để xem chi tiết
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LecturePlayerPage() {
  const params = useParams<{ id: string }>();
  const lectureId = params.id;

  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 px-4 md:px-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="aspect-video w-full rounded-lg" />
        </div>
      }
    >
      <LectureContent lectureId={lectureId} />
    </Suspense>
  );
}
