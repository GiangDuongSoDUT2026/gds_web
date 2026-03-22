"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Suspense, useCallback } from "react";
import { Search as SearchIcon } from "lucide-react";

import { SearchBar } from "@/components/search/SearchBar";
import { SearchResultCard } from "@/components/search/SearchResultCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { search } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
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

  const {
    data,
    isLoading,
    error,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.search.results(params),
    queryFn: () => search(params),
    enabled: !!q,
  });

  const handleSearch = useCallback(
    (newQuery: string, newMode: SearchMode, newCourseId?: string) => {
      const next = new URLSearchParams({ q: newQuery, mode: newMode });
      if (newCourseId) next.set("course_id", newCourseId);
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
      <div>
        <h1 className="text-2xl font-bold">Search</h1>
        <p className="text-muted-foreground">
          Search across all lecture transcripts, slides, and visual content
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
          <p className="text-lg font-medium">Enter a search query</p>
          <p className="text-sm text-muted-foreground">
            Use keyword mode for exact matches or semantic mode for
            concept-based search
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
          Search failed. Please try again.
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
              <p className="font-medium">No results found</p>
              <p className="text-sm text-muted-foreground">
                Try different keywords or switch to semantic search
              </p>
            </div>
          ) : (
            <div className="space-y-4">
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
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
              >
                Next
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
