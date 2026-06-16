"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  BookOpen,
  Video,
  Play,
  Sparkles,
  Clapperboard,
  MousePointerClick,
} from "lucide-react";
import { SearchBar } from "@/components/search/SearchBar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { RecommendationCard } from "@/components/recommendations/RecommendationCard";
import { getPrograms, getCoursesByProgram, getGpuQueueStats, getLearningStats, getRecommendations, getMyProgress } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";
import type { SearchMode } from "@/types/api";

function StatsCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const { data: programs, isLoading: programsLoading } = useQuery({
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

  const { data: gpuStats } = useQuery({
    queryKey: ["gpu-queue-stats"],
    queryFn: getGpuQueueStats,
    staleTime: 60 * 1000,
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
    select: (data) => data.filter((p) => !p.completed && p.percent > 0).slice(0, 4),
  });

  const handleSearch = (query: string, mode: SearchMode) => {
    const params = new URLSearchParams({ q: query, mode });
    router.push(`/search?${params.toString()}`);
  };

  const processingCount = (gpuStats?.today?.QUEUED_FOR_GPU ?? 0) + (gpuStats?.today?.RUNNING ?? 0);
  const failedCount = gpuStats?.today?.FAILED ?? 0;
  const totalInteractions = (learningStats?.total_scenes_viewed ?? 0) + (learningStats?.completed_lectures ?? 0);

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 space-y-8">
      {/* Hero search */}
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            AI Lecture Intelligence
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Search across all lecture transcripts, slides, and visual content
            using keyword or semantic AI-powered search.
          </p>
        </div>
        <div className="w-full max-w-2xl">
          <SearchBar onSearch={handleSearch} size="hero" />
        </div>
        {/* Login CTA for guests */}
        {!isAuthenticated() && (
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
            {" "}to access AI chat, track your progress, and get personalized recommendations.
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
              <Link
                key={p.lecture_id}
                href={`/lectures/${p.lecture_id}?t=${Math.floor(p.last_position_sec)}`}
              >
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

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Đề xuất cho bạn
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recommendations.slice(0, 8).map((rec) => (
              <RecommendationCard key={rec.lecture_id} lecture={rec} />
            ))}
          </div>
        </section>
      )}

      {/* Stats */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {programsLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </>
          ) : (
            <>
              <StatsCard
                title="Programs"
                value={programs?.length ?? 0}
                icon={BookOpen}
                description="Total academic programs"
              />
              <StatsCard
                title="Courses"
                value={totalCourses}
                icon={Video}
                description="Courses across all programs"
              />
              <StatsCard
                title="Videos"
                value={processingCount > 0 ? `${processingCount} đang xử lý` : failedCount > 0 ? `${failedCount} cần xử lý lại` : "Tất cả đã xong"}
                icon={Clapperboard}
                description={failedCount > 0 ? `${failedCount} video thất bại cần retry` : "Không có video bị lỗi"}
              />
              <StatsCard
                title="Hoạt động"
                value={totalInteractions}
                icon={MousePointerClick}
                description={`${learningStats?.total_scenes_viewed ?? 0} scenes xem • ${learningStats?.completed_lectures ?? 0} bài hoàn thành`}
              />
            </>
          )}
        </div>
      </div>

      {/* Programs list */}
      {!programsLoading && programs && programs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Programs</h2>
            <Link
              href="/programs"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {programs.slice(0, 6).map((program) => (
              <Link key={program.id} href={`/programs/${program.id}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary shrink-0" />
                      <CardTitle className="text-base line-clamp-1">
                        {program.name}
                      </CardTitle>
                    </div>
                    {program.description && (
                      <CardDescription className="line-clamp-2">
                        {program.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
