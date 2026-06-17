"use client";

import Link from "next/link";
import Image from "next/image";
import { BookOpen, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatTimestamp } from "@/lib/utils";
import type { SearchResult, SearchMode } from "@/types/api";

interface SearchResultCardProps {
  result: SearchResult;
  query: string;
  mode: SearchMode;
}

function highlightSnippet(text: string, query: string): string {
  if (!query.trim() || !text) return text;
  const words = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (words.length === 0) return text;
  const pattern = new RegExp(`(${words.join("|")})`, "gi");
  return text.replace(pattern, "<mark>$1</mark>");
}

export function SearchResultCard({ result, query, mode }: SearchResultCardProps) {
  const watchUrl = `/lectures/${result.lecture_id}?t=${Math.floor(result.timestamp_start)}`;
  const snippet = result.transcript || result.ocr_text || "";
  const highlightedSnippet = highlightSnippet(snippet, query);

  return (
    <Link href={watchUrl} className="group block rounded-lg overflow-hidden border bg-card hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        {result.keyframe_url ? (
          <Image
            src={result.keyframe_url}
            alt={result.lecture_title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BookOpen className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}
        {/* Timestamp badge */}
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 text-xs text-white tabular-nums">
          {formatTimestamp(result.timestamp_start)}
        </span>
        {/* Play overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
          <div className="rounded-full bg-white/90 p-2">
            <Play className="h-5 w-5 text-black fill-black" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <p className="text-xs text-muted-foreground line-clamp-1">
          {result.course_name} › {result.chapter_title}
        </p>
        <h3 className="text-sm font-semibold line-clamp-2 leading-snug">
          {result.lecture_title}
        </h3>

        {snippet && (
          <p
            className="text-xs text-muted-foreground line-clamp-2 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: highlightedSnippet }}
          />
        )}

        <div className="flex items-center gap-2 pt-0.5">
          <Badge variant="outline" className="text-xs px-1.5 py-0">
            {formatTimestamp(result.timestamp_start)} – {formatTimestamp(result.timestamp_end)}
          </Badge>
          {mode === "semantic" && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {Math.round(result.score * 100)}% match
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
