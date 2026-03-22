"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { getPrograms, getCoursesByProgram } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { SearchMode } from "@/types/api";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  onSearch: (
    query: string,
    mode: SearchMode,
    courseId?: string
  ) => void;
  initialQuery?: string;
  initialMode?: SearchMode;
  initialCourseId?: string;
  isLoading?: boolean;
  className?: string;
  size?: "default" | "hero";
}

export function SearchBar({
  onSearch,
  initialQuery = "",
  initialMode = "keyword",
  initialCourseId,
  isLoading = false,
  className,
  size = "default",
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<SearchMode>(initialMode);
  const ALL = "__all__";
  const [selectedProgramId, setSelectedProgramId] = useState<string>(ALL);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    initialCourseId ?? ALL
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: programs } = useQuery({
    queryKey: queryKeys.programs.all(),
    queryFn: getPrograms,
  });

  const { data: courses } = useQuery({
    queryKey: queryKeys.courses.byProgram(selectedProgramId),
    queryFn: () => getCoursesByProgram(selectedProgramId),
    enabled: !!selectedProgramId && selectedProgramId !== ALL,
  });

  // Cmd+K focus shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!query.trim()) return;
      onSearch(query.trim(), mode, selectedCourseId === ALL ? undefined : selectedCourseId || undefined);
    },
    [query, mode, selectedCourseId, onSearch]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("w-full", className)}
    >
      <div className={cn("flex flex-col gap-3", size === "hero" && "gap-4")}>
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search lectures, transcripts, and slides..."
              className={cn(
                "pl-9 pr-4",
                size === "hero" && "h-12 text-base"
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
            />
          </div>
          <Button
            type="submit"
            disabled={!query.trim() || isLoading}
            className={cn(size === "hero" && "h-12 px-6")}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Search"
            )}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Mode toggle */}
          <div className="flex items-center gap-1 rounded-md border p-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setMode("keyword")}
                    className={cn(
                      "rounded px-3 py-1 text-sm font-medium transition-colors",
                      mode === "keyword"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Keyword
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Exact term matching across transcripts and OCR text</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setMode("semantic")}
                    className={cn(
                      "rounded px-3 py-1 text-sm font-medium transition-colors",
                      mode === "semantic"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Semantic
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>AI-powered vector search — finds conceptually related content</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Program filter */}
          <Select
            value={selectedProgramId}
            onValueChange={(val) => {
              setSelectedProgramId(val);
              setSelectedCourseId(ALL);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All programs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All programs</SelectItem>
              {programs?.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Course filter */}
          <Select
            value={selectedCourseId}
            onValueChange={setSelectedCourseId}
            disabled={!selectedProgramId || selectedProgramId === ALL}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All courses</SelectItem>
              {courses?.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </form>
  );
}
