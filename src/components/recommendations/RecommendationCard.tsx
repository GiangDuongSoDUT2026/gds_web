import Link from "next/link";
import { Play, BookOpen, RotateCcw, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDuration } from "@/lib/utils";
import type { RecommendedLecture } from "@/types/api";

const REASON_CONFIG = {
  continue: { label: "Tiếp tục xem", icon: Play, color: "bg-blue-100 text-blue-700" },
  next_in_chapter: { label: "Tiếp theo", icon: RotateCcw, color: "bg-green-100 text-green-700" },
  related_topic: { label: "Liên quan", icon: Sparkles, color: "bg-purple-100 text-purple-700" },
  new: { label: "Mới", icon: BookOpen, color: "bg-gray-100 text-gray-700" },
};

export function RecommendationCard({ lecture }: { lecture: RecommendedLecture }) {
  const config = REASON_CONFIG[lecture.reason] ?? REASON_CONFIG.new;
  const Icon = config.icon;
  const href = lecture.reason === "continue"
    ? `/lectures/${lecture.lecture_id}?t=${Math.floor(lecture.last_position_sec)}`
    : `/lectures/${lecture.lecture_id}`;

  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="p-3 space-y-2">
          {/* Keyframe thumbnail */}
          <div className="aspect-video rounded-md overflow-hidden bg-muted relative">
            {lecture.keyframe_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lecture.keyframe_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <BookOpen className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <span className={`absolute top-1.5 left-1.5 text-xs px-1.5 py-0.5 rounded font-medium flex items-center gap-1 ${config.color}`}>
              <Icon className="h-3 w-3" />
              {config.label}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium line-clamp-2 leading-snug">{lecture.lecture_title}</p>
            <p className="text-xs text-muted-foreground truncate">{lecture.course_name}</p>
            {lecture.duration_sec && (
              <p className="text-xs text-muted-foreground">{formatDuration(lecture.duration_sec)}</p>
            )}
          </div>

          {lecture.progress_percent > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Tiến độ</span>
                <span>{lecture.progress_percent}%</span>
              </div>
              <Progress value={lecture.progress_percent} className="h-1" />
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
