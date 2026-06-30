"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Suspense, useCallback } from "react";
import { Search as SearchIcon, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { SearchBar } from "@/components/search/SearchBar";
import { SearchResultCard } from "@/components/search/SearchResultCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { search, logLearningEvent } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthStore } from "@/store/useAuthStore";
import type { SearchMode, SearchParams } from "@/types/api";

const PAGE_SIZE = 10;

function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const mode = (searchParams.get("mode") ?? "keyword") as SearchMode;
  const courseId = searchParams.get("course_id") ?? undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const offset = (page - 1) * PAGE_SIZE;

  const params: SearchParams = {
    q,
    mode,
    course_id: courseId,
    limit: PAGE_SIZE,
    offset,
  };

  const { isAuthenticated } = useAuthStore();

  const {
    data,
    isLoading,
    error,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.search.results(params),
    queryFn: async () => {
      const result = await search(params);
      if (isAuthenticated()) {
        logLearningEvent({ event_type: "search", payload: { q, mode } }).catch(() => {});
      }
      return result;
    },
    enabled: !!q,
  });

  const handleSearch = useCallback(
    (newQuery: string, _mode: SearchMode) => {
      const next = new URLSearchParams({ q: newQuery, mode: "keyword" });
      next.set("page", "1");
      router.push(`/search?${next.toString()}`);
    },
    [router]
  );

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("page", String(newPage));
    router.push(`/search?${next.toString()}`);
  };

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Trang chủ
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold">Tìm kiếm</h1>
        <p className="text-muted-foreground">
          Tìm kiếm trong transcript, slide và nội dung hình ảnh của tất cả bài giảng
        </p>
      </div>

      <SearchBar
        onSearch={handleSearch}
        initialQuery={q}
        initialMode={mode}
        initialCourseId={courseId}
        isLoading={isFetching}
      />

      {/* Empty state — no query */}
      {!q && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <SearchIcon className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Nhập từ khóa để tìm kiếm</p>
          <p className="text-sm text-muted-foreground">
            Tìm kiếm theo từ khóa trong transcript, slide và nội dung bài giảng
          </p>
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && q && (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-lg" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && q && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          Tìm kiếm thất bại. Vui lòng thử lại.
        </div>
      )}

      {/* Results */}
      {data && q && (
        <>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {data.total} result{data.total !== 1 ? "s" : ""} for &ldquo;{data.query}&rdquo;
              {mode === "semantic" && " (semantic)"}
            </span>
            {isFetching && (
              <span className="text-xs">Updating...</span>
            )}
          </div>

          {data.results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <SearchIcon className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="font-medium">Không tìm thấy kết quả</p>
              <p className="text-sm text-muted-foreground">
                Thử từ khóa khác hoặc tìm kiếm ngữ nghĩa
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {data.results.map((result) => (
                <SearchResultCard
                  key={`${result.scene_id}-${result.lecture_id}`}
                  result={result}
                  query={data.query}
                  mode={data.mode as import("@/types/api").SearchMode}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
              >
                Trước
              </Button>
              <span className="text-sm text-muted-foreground">
                Trang {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
              >
                Sau
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 px-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full" />
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
