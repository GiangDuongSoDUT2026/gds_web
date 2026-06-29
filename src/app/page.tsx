"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  BookOpen,
  Users,
  Play,
  Sparkles,
  Clapperboard,
  Activity,
  Cpu,
  CheckCircle2,
  Clock,
  XCircle,
  Wifi,
  WifiOff,
  ExternalLink,
} from "lucide-react";
import { SearchBar } from "@/components/search/SearchBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RecommendationCard } from "@/components/recommendations/RecommendationCard";
import {
  getPrograms, getCoursesByProgram, getGpuQueueStats, getGpuSessions,
  getSystemStats, getLearningStats, getRecommendations, getMyProgress, search,
} from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";
import type { SearchMode } from "@/types/api";

function ClickableStatCard({
  title, value, sub, icon: Icon, href, color,
}: {
  title: string; value: string | number; sub?: string;
  icon: React.ElementType; href: string; color?: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{title}</CardTitle>
          <Icon className={`h-4 w-4 ${color ?? "text-muted-foreground"}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}

function GpuStatusPanel() {
  const { data: gpuStats } = useQuery({
    queryKey: ["gpu-queue-stats"],
    queryFn: getGpuQueueStats,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["gpu-sessions"],
    queryFn: getGpuSessions,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const allTime = gpuStats?.all_time ?? {};
  const today = gpuStats?.today ?? {};
  // Combine all intermediate processing statuses into one count
  const inProgressCount = (["RUNNING", "DISPATCHED", "SCENES_READY", "AWAITING_EMBEDDING"] as const)
    .reduce((sum, k) => sum + (allTime[k] ?? 0), 0);
  const statusItems = [
    { label: "Hoàn thành", value: today["COMPLETED"] ?? 0, icon: CheckCircle2, color: "text-green-500" },
    { label: "Chờ xử lý", value: allTime["QUEUED_FOR_GPU"] ?? 0, icon: Clock, color: "text-yellow-500" },
    { label: "Đang xử lý", value: inProgressCount, icon: Activity, color: "text-blue-500" },
    { label: "Thất bại", value: today["FAILED"] ?? 0, icon: XCircle, color: "text-red-500" },
  ];

  const onlineSessions = sessions.filter((s) => s.is_online);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* GPU Queue Today */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              GPU Queue
            </CardTitle>
            <Link href="/admin/gpu-queue" className="text-xs text-primary hover:underline flex items-center gap-1">
              Chi tiết <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {statusItems.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color} shrink-0`} />
                <div>
                  <p className="text-lg font-bold leading-none">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* GPU Sessions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            GPU Sessions
            <Badge variant={onlineSessions.length > 0 ? "default" : "secondary"} className="text-xs ml-auto">
              {onlineSessions.length} online
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground">Không có session nào</p>
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 4).map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-xs">
                  {s.is_online
                    ? <Wifi className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    : <WifiOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                  <span className={`font-medium ${!s.is_online ? "text-muted-foreground" : ""}`}>{s.session_type}</span>
                  <Badge variant="outline" className={`text-[10px] px-1 py-0 ${!s.is_online ? "text-muted-foreground border-muted" : ""}`}>
                    {s.is_online ? s.status : "offline"}
                  </Badge>
                  {s.is_online && s.current_job_id && (
                    <span className="text-muted-foreground truncate">đang xử lý job</span>
                  )}
                  <span className="ml-auto text-muted-foreground shrink-0">
                    {s.last_heartbeat
                      ? new Date(s.last_heartbeat).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isFacultyAdminOrAbove } = useAuthStore();

  const { data: programs } = useQuery({
    queryKey: queryKeys.programs.all(),
    queryFn: getPrograms,
    retry: 1,
  });

  const { data: totalCourses = 0 } = useQuery({
    queryKey: ["total-courses"],
    queryFn: async () => {
      const progs = await getPrograms();
      const results = await Promise.all(progs.map((p) => getCoursesByProgram(p.id)));
      return results.reduce((sum, courses) => sum + courses.length, 0);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!programs,
  });

  const { data: systemStats } = useQuery({
    queryKey: ["system-stats"],
    queryFn: getSystemStats,
    enabled: isAuthenticated() && isFacultyAdminOrAbove(),
    staleTime: 2 * 60 * 1000,
  });

  const { data: learningStats } = useQuery({
    queryKey: ["learning-stats"],
    queryFn: getLearningStats,
    enabled: isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ["recommendations"],
    queryFn: getRecommendations,
    enabled: isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: inProgress = [] } = useQuery({
    queryKey: ["my-progress"],
    queryFn: getMyProgress,
    enabled: isAuthenticated(),
    select: (data) => data.filter((p) => !p.completed && p.watched_seconds > 0).slice(0, 4),
  });

  const [lastSearchQuery, setLastSearchQuery] = useState("");
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("gds-recent-searches") ?? "[]") as string[];
      if (stored.length > 0) setLastSearchQuery(stored[0]);
    } catch {}
  }, []);

  const { data: searchBasedRecs = [] } = useQuery({
    queryKey: ["search-based-recs", lastSearchQuery],
    queryFn: async () => {
      const res = await search({ q: lastSearchQuery, mode: "semantic", limit: 12 });
      const seen = new Set<string>();
      return (res.results ?? []).filter((r) => {
        if (seen.has(r.lecture_id)) return false;
        seen.add(r.lecture_id);
        return true;
      }).slice(0, 8);
    },
    enabled: !!lastSearchQuery,
    staleTime: 5 * 60 * 1000,
  });

  // Merge search-based recs + backend recs into one deduped list
  const mergedRecs = useMemo(() => {
    const seen = new Set<string>();
    const items: Array<{ kind: "search"; r: (typeof searchBasedRecs)[0] } | { kind: "rec"; r: (typeof recommendations)[0] }> = [];
    for (const r of searchBasedRecs) {
      if (!seen.has(r.lecture_id)) { seen.add(r.lecture_id); items.push({ kind: "search", r }); }
    }
    for (const r of recommendations) {
      if (!seen.has(r.lecture_id) && items.length < 8) { seen.add(r.lecture_id); items.push({ kind: "rec", r }); }
    }
    return items;
  }, [searchBasedRecs, recommendations]);

  const handleSearch = (query: string, mode: SearchMode) => {
    const params = new URLSearchParams({ q: query, mode });
    router.push(`/search?${params.toString()}`);
  };

  const completedVideos = systemStats?.videos?.["COMPLETED"] ?? 0;
  const processingVideos = (systemStats?.videos?.["PROCESSING"] ?? 0) + (systemStats?.videos?.["PENDING"] ?? 0);
  const totalInteractions = (learningStats?.total_scenes_viewed ?? 0) + (learningStats?.completed_lectures ?? 0);

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 space-y-8">
      {/* Hero search */}
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Giảng Đường Số</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Tìm kiếm trong transcript, slide và nội dung hình ảnh của tất cả bài giảng.
          </p>
        </div>
        <div className="w-full max-w-2xl">
          <SearchBar onSearch={handleSearch} size="hero" />
        </div>
        {!isAuthenticated() && (
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline font-medium">Đăng nhập</Link>
            {" "}để dùng AI Chat, theo dõi tiến độ học và nhận gợi ý cá nhân hóa.
          </p>
        )}
      </div>

      {/* Continue watching */}
      {inProgress.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Tiếp tục học
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {inProgress.map((p) => (
              <Link key={p.lecture_id} href={`/lectures/${p.lecture_id}?t=${Math.floor(p.last_position_sec)}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-3 space-y-2">
                    <p className="text-sm font-medium line-clamp-2">{p.lecture_title}</p>
                    <p className="text-xs text-muted-foreground">{p.course_name}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{p.chapter_title}</span>
                        <span>{p.percent}%</span>
                      </div>
                      <Progress value={p.percent} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Merged recommendations: search-based first, then backend recs */}
      {mergedRecs.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Đề xuất cho bạn
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {mergedRecs.map((item) =>
              item.kind === "search" ? (
                <Link key={item.r.scene_id} href={`/lectures/${item.r.lecture_id}?t=${Math.floor(item.r.timestamp_start)}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardContent className="p-3 space-y-2">
                      <div className="aspect-video rounded-md overflow-hidden bg-muted">
                        {item.r.keyframe_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.r.keyframe_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <BookOpen className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-medium line-clamp-2 leading-snug">{item.r.lecture_title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.r.course_name}</p>
                    </CardContent>
                  </Card>
                </Link>
              ) : (
                <RecommendationCard key={item.r.lecture_id} lecture={item.r} />
              )
            )}
          </div>
        </section>
      )}

      {/* Stats — clickable boxes */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Tổng quan</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ClickableStatCard
            title="Chương trình & Môn học"
            value={`${programs?.length ?? "—"} chương trình`}
            sub={`${totalCourses} môn học`}
            icon={BookOpen}
            href="/programs"
            color="text-blue-500"
          />
          <ClickableStatCard
            title="Người dùng"
            value={systemStats?.total_users ?? "—"}
            sub="Tổng số tài khoản hệ thống"
            icon={Users}
            href="/admin/users"
            color="text-purple-500"
          />
          <ClickableStatCard
            title="Videos hoàn thành"
            value={completedVideos || "—"}
            sub={processingVideos > 0 ? `${processingVideos} đang xử lý` : "Không có video đang xử lý"}
            icon={Clapperboard}
            href="/admin/gpu-queue"
            color="text-green-500"
          />
          <ClickableStatCard
            title="Hoạt động"
            value={totalInteractions}
            sub={`${learningStats?.total_scenes_viewed ?? 0} cảnh xem • ${learningStats?.completed_lectures ?? 0} bài hoàn thành`}
            icon={Activity}
            href="/activity"
            color="text-orange-500"
          />
        </div>
      </div>

      {/* GPU & System Status */}
      {isAuthenticated() && isFacultyAdminOrAbove() && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            Hệ thống xử lý
          </h2>
          <GpuStatusPanel />
        </div>
      )}
    </div>
  );
}
