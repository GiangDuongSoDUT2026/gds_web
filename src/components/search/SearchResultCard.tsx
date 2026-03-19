"use client";

import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Clock, BookOpen } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export function SearchResultCard({
  result,
  query,
  mode,
}: SearchResultCardProps) {
  const watchUrl = `/lectures/${result.lecture_id}?t=${Math.floor(result.timestamp_start)}`;
  const snippet = result.transcript || result.ocr_text || "";
  const highlightedSnippet = highlightSnippet(snippet, query);

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-0">
        <div className="flex gap-0">
          {/* Keyframe thumbnail */}
          <div className="relative h-32 w-48 shrink-0 overflow-hidden bg-muted sm:h-36 sm:w-56">
            {result.keyframe_url ? (
              <Image
                src={result.keyframe_url}
                alt={`Scene from ${result.lecture_title}`}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            {/* Timestamp overlay */}
            <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
              {formatTimestamp(result.timestamp_start)}
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-1 flex-col justify-between gap-2 p-3">
            <div className="space-y-1">
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {result.course_name} &rsaquo; {result.chapter_title}
              </p>
              <h3 className="line-clamp-1 font-semibold leading-tight">
                {result.lecture_title}
              </h3>

              {snippet && (
                <p
                  className="line-clamp-2 text-sm text-muted-foreground"
                  dangerouslySetInnerHTML={{
                    __html: highlightedSnippet,
                  }}
                />
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1 text-xs">
                  <Clock className="h-3 w-3" />
                  {formatTimestamp(result.timestamp_start)} &ndash;{" "}
                  {formatTimestamp(result.timestamp_end)}
                </Badge>
                {mode === "semantic" && (
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(result.score * 100)}% match
                  </Badge>
                )}
              </div>

              <Button asChild size="sm" className="shrink-0 gap-1">
                <Link href={watchUrl}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  Watch
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
