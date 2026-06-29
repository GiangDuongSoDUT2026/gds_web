"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Clock, Eye, CheckCircle2, Flame, TrendingUp, Users } from "lucide-react";
import { getLearningStats, getMyProgress, getSystemLearningStats } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/useAuthStore";

function fmt(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} phút`;
}

export default function LearningStatsPage() {
  const { isFacultyAdminOrAbove } = useAuthStore();
  const isAdmin = isFacultyAdminOrAbove();

  const { data: sysStats, isLoading: sysLoading } = useQuery({
    queryKey: ["system-learning-stats"],
    queryFn: getSystemLearningStats,
    enabled: isAdmin,
    staleTime: 60 * 1000,
  });

  const { data: myStats, isLoading: myStatsLoading } = useQuery({
    queryKey: ["learning-stats"],
    queryFn: getLearningStats,
    staleTime: 60 * 1000,
  });

  const { data: progress = [], isLoading: progressLoading } = useQuery({
    queryKey: ["my-progress"],
    queryFn: getMyProgress,
    staleTime: 60 * 1000,
  });

  const inProgress = progress.filter((p) => !p.completed && p.watched_seconds > 0);
  const completed = progress.filter((p) => p.completed);

  const statsLoading = isAdmin ? sysLoading : myStatsLoading;

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Trang chủ
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <TrendingUp className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Hoạt động học tập</h1>
          {isAdmin && (
            <p className="text-sm text-muted-foreground mt-0.5">Thống kê toàn hệ thống — tất cả người dùng</p>
          )}
        </div>
      </div>

      {/* System-wide stats for admins */}
      {isAdmin && (
        <>
          {statsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : sysStats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-4 flex flex-col items-center gap-1">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <p className="text-2xl font-bold">{fmt(sysStats.total_watched_seconds)}</p>
                  <p className="text-xs text-muted-foreground text-center">Tổng thời gian xem</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 flex flex-col items-center gap-1">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <p className="text-2xl font-bold">{sysStats.total_completed_lectures}</p>
                  <p className="text-xs text-muted-foreground text-center">Bài hoàn thành</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 flex flex-col items-center gap-1">
                  <Eye className="h-5 w-5 text-purple-500" />
                  <p className="text-2xl font-bold">{sysStats.total_progress_records}</p>
                  <p className="text-xs text-muted-foreground text-center">Lượt xem video</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 flex flex-col items-center gap-1">
                  <Users className="h-5 w-5 text-orange-500" />
                  <p className="text-2xl font-bold">{sysStats.active_users}</p>
                  <p className="text-xs text-muted-foreground text-center">Người dùng đã xem</p>
                </CardContent>
              </Card>
            </div>
          ) : null}
          <hr className="border-border" />
          <p className="text-sm font-medium text-muted-foreground">Lịch sử xem của bạn</p>
        </>
      )}

      {/* Personal stats for non-admins */}
      {!isAdmin && (
        <>
          {myStatsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : myStats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-4 flex flex-col items-center gap-1">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <p className="text-2xl font-bold">{fmt(myStats.total_watched_seconds)}</p>
                  <p className="text-xs text-muted-foreground text-center">Thời gian xem</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 flex flex-col items-center gap-1">
                  <Eye className="h-5 w-5 text-purple-500" />
                  <p className="text-2xl font-bold">{myStats.total_scenes_viewed}</p>
                  <p className="text-xs text-muted-foreground text-center">Cảnh đã xem</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 flex flex-col items-center gap-1">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <p className="text-2xl font-bold">{myStats.completed_lectures}</p>
                  <p className="text-xs text-muted-foreground text-center">Bài hoàn thành</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 flex flex-col items-center gap-1">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <p className="text-2xl font-bold">{myStats.streak_days}</p>
                  <p className="text-xs text-muted-foreground text-center">Ngày liên tiếp</p>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </>
      )}

      {/* In progress */}
      {!progressLoading && inProgress.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Đang học ({inProgress.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inProgress.map((p) => (
              <Link
                key={p.lecture_id}
                href={`/lectures/${p.lecture_id}?t=${Math.floor(p.last_position_sec)}`}
                className="block hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
              >
                <div className="flex justify-between items-start mb-1.5">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="text-sm font-medium truncate">{p.lecture_title}</p>
                    <p className="text-xs text-muted-foreground">{p.course_name} · {p.chapter_title}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{p.percent}%</span>
                </div>
                <Progress value={p.percent} className="h-1.5" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Completed */}
      {!progressLoading && completed.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Đã hoàn thành ({completed.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {completed.map((p) => (
                <Link
                  key={p.lecture_id}
                  href={`/lectures/${p.lecture_id}`}
                  className="flex items-center justify-between py-2.5 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.lecture_title}</p>
                    <p className="text-xs text-muted-foreground">{p.course_name}</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 ml-3" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!progressLoading && progress.length === 0 && (
        <div className="py-16 text-center text-muted-foreground text-sm">
          Bạn chưa xem bài giảng nào.{" "}
          <Link href="/programs" className="text-primary hover:underline">
            Khám phá ngay
          </Link>
        </div>
      )}

      {progressLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}
    </div>
  );
}
