"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, ExternalLink } from "lucide-react";
import Link from "next/link";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getLecture, updateProgress } from "@/lib/api";
import { formatTimestamp, toProxiedUrl, toVideoStreamUrl } from "@/lib/utils";
import type { Citation } from "@/types/api";

interface VideoPopupDialogProps {
  open: boolean;
  onClose: () => void;
  lectureId: string;
  timestampStart: number;
  lectureTitle?: string;
  videoUrl?: string | null;
  relatedCitations?: Citation[];
  onOpenCitation?: (citation: Citation) => void;
}

export function VideoPopupDialog({
  open,
  onClose,
  lectureId,
  timestampStart,
  lectureTitle,
  videoUrl: videoUrlProp,
  relatedCitations = [],
  onOpenCitation,
}: VideoPopupDialogProps) {
  const [currentTime, setCurrentTime] = useState(timestampStart);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasSeeked = useRef(false);
  const watchedSecondsRef = useRef(0);
  const queryClient = useQueryClient();

  // Only fetch from API if no video URL was provided directly
  const { data: lecture } = useQuery({
    queryKey: ["lecture", lectureId],
    queryFn: () => getLecture(lectureId),
    enabled: open && !!lectureId && !videoUrlProp,
    staleTime: 5 * 60 * 1000,
  });

  const resolvedVideoUrl = videoUrlProp || lecture?.video_url || null;
  const resolvedTitle = lecture?.title ?? lectureTitle ?? "Video bài giảng";

  // Seek to timestamp once video is ready
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !open) return;

    const handleCanPlay = () => {
      if (!hasSeeked.current && timestampStart > 0) {
        video.currentTime = timestampStart;
        hasSeeked.current = true;
      }
      video.play().catch(() => {});
    };

    video.addEventListener("canplay", handleCanPlay);
    return () => video.removeEventListener("canplay", handleCanPlay);
  }, [open, timestampStart, resolvedVideoUrl]);

  // Reset state when dialog re-opens
  useEffect(() => {
    if (open) {
      hasSeeked.current = false;
      watchedSecondsRef.current = 0;
    }
  }, [open]);

  // Record progress every 30s
  useEffect(() => {
    if (!open || !lectureId) return;
    const timer = setInterval(async () => {
      watchedSecondsRef.current += 30;
      try {
        await updateProgress(lectureId, {
          position_sec: currentTime,
          watched_seconds: watchedSecondsRef.current,
        });
        queryClient.invalidateQueries({ queryKey: ["my-progress-chat"] });
      } catch { /* non-critical */ }
    }, 30_000);
    return () => clearInterval(timer);
  }, [open, lectureId, currentTime, queryClient]);

  const handleClose = useCallback(async () => {
    if (lectureId && watchedSecondsRef.current > 0) {
      try {
        await updateProgress(lectureId, {
          position_sec: currentTime,
          watched_seconds: watchedSecondsRef.current,
        });
        queryClient.invalidateQueries({ queryKey: ["my-progress-chat"] });
      } catch { /* non-critical */ }
    }
    watchedSecondsRef.current = 0;
    onClose();
  }, [lectureId, currentTime, onClose, queryClient]);

  const related = relatedCitations.filter((c) => {
    const cid = c.lecture_id || "";
    return cid !== lectureId;
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-sm font-semibold leading-tight pr-6">
            {resolvedTitle}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className="text-xs h-5">
              {formatTimestamp(currentTime)}
            </Badge>
            {lecture?.duration_sec && (
              <span className="text-xs text-muted-foreground">
                / {formatTimestamp(lecture.duration_sec)}
              </span>
            )}
            {lectureId && (
              <Link
                href={`/lectures/${lectureId}?t=${Math.floor(timestampStart)}`}
                className="ml-auto text-xs text-primary flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Mở trang đầy đủ
              </Link>
            )}
          </div>
        </DialogHeader>

        {/* Video player — native HTML5 video with Range request support */}
        <div className="bg-black w-full aspect-video">
          {resolvedVideoUrl ? (
            <video
              ref={videoRef}
              key={resolvedVideoUrl}
              src={toVideoStreamUrl(resolvedVideoUrl)}
              controls
              className="w-full h-full"
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-white/50 text-sm">
              {open && !resolvedVideoUrl ? "Đang tải..." : "Video không khả dụng"}
            </div>
          )}
        </div>

        {/* Related citations */}
        {related.length > 0 && (
          <div className="px-4 py-3 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Có thể bạn quan tâm</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {related.map((c, i) => (
                <button
                  key={i}
                  onClick={() => onOpenCitation?.(c)}
                  className="shrink-0 w-48 rounded-lg border overflow-hidden hover:border-primary transition-colors text-left group"
                >
                  <div className="relative h-24 bg-muted">
                    {c.keyframe_url ? (
                      <img src={toProxiedUrl(c.keyframe_url)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <Badge className="absolute bottom-1 left-1 text-xs h-4 px-1">
                      {formatTimestamp(c.timestamp_start)}
                    </Badge>
                  </div>
                  <div className="p-1.5">
                    <p className="text-xs font-medium line-clamp-1">{c.lecture_title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{c.chapter_title}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
