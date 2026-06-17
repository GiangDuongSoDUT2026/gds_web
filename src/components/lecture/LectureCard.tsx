"use client";

import Link from "next/link";
import Image from "next/image";
import { Video, RefreshCw, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDuration } from "@/lib/utils";
import type { LectureVideo } from "@/types/api";

interface LectureCardProps {
  lecture: LectureVideo;
  courseId?: string;
  canManage?: boolean;
  isReprocessing?: boolean;
  isDeleting?: boolean;
  onReprocess?: (id: string) => void;
  onEdit?: (lecture: LectureVideo) => void;
  onDelete?: (id: string) => void;
}

export function LectureCard({
  lecture,
  courseId,
  canManage,
  isReprocessing,
  isDeleting,
  onReprocess,
  onEdit,
  onDelete,
}: LectureCardProps) {
  const thumbnailUrl = lecture.scenes.find((s) => s.keyframe_url)?.keyframe_url ?? null;
  const href = `/lectures/${lecture.id}${courseId ? `?courseId=${courseId}` : ""}`;
  const needsReprocess = lecture.status === "FAILED" || lecture.status === "PENDING";

  return (
    <div className="group rounded-lg overflow-hidden border bg-card flex flex-col hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <Link href={href} className="relative block aspect-video bg-muted overflow-hidden shrink-0">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={lecture.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Video className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}
        {/* Duration badge */}
        {lecture.duration_sec != null && lecture.duration_sec > 0 && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 text-xs text-white tabular-nums">
            {formatDuration(lecture.duration_sec)}
          </span>
        )}
        {/* Status overlay */}
        <span className="absolute top-1.5 right-1.5">
          <StatusBadge status={lecture.status} />
        </span>
      </Link>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        <Link href={href} className="hover:text-primary transition-colors">
          <p className="text-sm font-medium line-clamp-2 leading-snug">{lecture.title}</p>
          {lecture.scenes.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">{lecture.scenes.length} cảnh</p>
          )}
        </Link>

        {/* Actions */}
        {canManage && (
          <div className="flex items-center gap-1 mt-auto">
            {needsReprocess && onReprocess && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs gap-1"
                disabled={isReprocessing}
                onClick={() => onReprocess(lecture.id)}
              >
                {isReprocessing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Xử lý lại
              </Button>
            )}
            {onEdit && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 ml-auto"
                onClick={() => onEdit(lecture)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive hover:text-destructive"
                disabled={isDeleting}
                onClick={() => {
                  if (confirm(`Xóa "${lecture.title}"?`)) onDelete(lecture.id);
                }}
              >
                {isDeleting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
