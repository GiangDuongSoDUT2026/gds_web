"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Loader2, Clock, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { SearchMode } from "@/types/api";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "gds-recent-searches";
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveRecentSearch(q: string) {
  const prev = getRecentSearches().filter((s) => s !== q);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([q, ...prev].slice(0, MAX_RECENT)));
}

function removeRecentSearch(q: string) {
  const prev = getRecentSearches().filter((s) => s !== q);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
}

interface SearchBarProps {
  onSearch: (query: string, mode: SearchMode, courseId?: string) => void;
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
  const [showRecent, setShowRecent] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowRecent(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = useCallback(
    (q: string = query) => {
      if (!q.trim()) return;
      saveRecentSearch(q.trim());
      setShowRecent(false);
      onSearch(q.trim(), "keyword");
    },
    [query, onSearch]
  );

  const handleFocus = () => {
    setRecentSearches(getRecentSearches());
    setShowRecent(true);
  };

  const handleRemove = (e: React.MouseEvent, q: string) => {
    e.stopPropagation();
    removeRecentSearch(q);
    setRecentSearches(getRecentSearches());
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className={cn("w-full", className)}>
      <div className="relative flex items-center gap-2" ref={containerRef}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            placeholder="Tìm kiếm bài giảng, transcript, slide..."
            className={cn("pl-9 pr-4", size === "hero" && "h-12 text-base")}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            autoComplete="off"
          />
          {/* Recent searches dropdown */}
          {showRecent && recentSearches.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-md border bg-popover shadow-md">
              <p className="px-3 pt-2 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Tìm kiếm gần đây
              </p>
              {recentSearches.map((s) => (
                <div
                  key={s}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent text-sm"
                  onMouseDown={(e) => { e.preventDefault(); setQuery(s); handleSubmit(s); }}
                >
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{s}</span>
                  <button
                    type="button"
                    className="p-0.5 rounded hover:bg-muted"
                    onMouseDown={(e) => handleRemove(e, s)}
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <Button
          type="submit"
          disabled={!query.trim() || isLoading}
          className={cn(size === "hero" && "h-12 px-6")}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </div>
    </form>
  );
}
