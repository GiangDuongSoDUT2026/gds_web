"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  isLoading = false,
  className,
  size = "default",
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);

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
      onSearch(query.trim(), "keyword");
    },
    [query, onSearch]
  );

  return (
    <form onSubmit={handleSubmit} className={cn("w-full", className)}>
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm bài giảng, transcript, slide..."
            className={cn("pl-9 pr-4", size === "hero" && "h-12 text-base")}
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
    </form>
  );
}
