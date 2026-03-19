"use client";

import Link from "next/link";
import Image from "next/image";
import { ExternalLink, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatTimestamp } from "@/lib/utils";
import type { Citation } from "@/types/api";

interface CitationCardProps {
  citation: Citation;
  index?: number;
}

export function CitationCard({ citation, index }: CitationCardProps) {
  // Build the deep link: prefer the backend-provided one, but also handle local routing
  const deepLink = citation.deep_link
    ? citation.deep_link.startsWith("/")
      ? citation.deep_link
      : `/${citation.deep_link}`
    : citation.lecture_id
    ? `/lectures/${citation.lecture_id}?t=${Math.floor(citation.timestamp_start)}`
    : "#";

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex gap-0">
          {/* Keyframe */}
          <div className="relative h-20 w-32 shrink-0 overflow-hidden bg-muted">
            {citation.keyframe_url ? (
              <Image
                src={citation.keyframe_url}
                alt={`Scene from ${citation.lecture_title}`}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <BookOpen className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-1 flex-col justify-between gap-1 p-2">
            <div className="space-y-0.5">
              {index !== undefined && (
                <Badge variant="outline" className="mb-1 text-xs">
                  [{index + 1}]
                </Badge>
              )}
              <p className="line-clamp-1 text-xs font-medium leading-tight">
                {citation.lecture_title}
              </p>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {citation.chapter_title}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatTimestamp(citation.timestamp_start)} &ndash;{" "}
                {formatTimestamp(citation.timestamp_end)}
              </p>
            </div>

            <Button asChild size="sm" variant="outline" className="h-7 gap-1 text-xs">
              <Link href={deepLink}>
                <ExternalLink className="h-3 w-3" />
                Watch
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
