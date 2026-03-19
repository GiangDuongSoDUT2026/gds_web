"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { BookOpen } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatTimestamp } from "@/lib/utils";
import type { Scene } from "@/types/api";
import { cn } from "@/lib/utils";

interface SceneTimelineProps {
  scenes: Scene[];
  currentTimestamp: number;
  onSceneClick: (scene: Scene) => void;
}

function getActiveSceneIndex(scenes: Scene[], timestamp: number): number {
  // Find the last scene whose start is <= currentTimestamp
  let activeIndex = 0;
  for (let i = 0; i < scenes.length; i++) {
    if (scenes[i].timestamp_start <= timestamp) {
      activeIndex = i;
    } else {
      break;
    }
  }
  return activeIndex;
}

export function SceneTimeline({
  scenes,
  currentTimestamp,
  onSceneClick,
}: SceneTimelineProps) {
  const activeIndex = getActiveSceneIndex(scenes, currentTimestamp);
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to active scene
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeIndex]);

  if (scenes.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No scenes available
      </div>
    );
  }

  return (
    <ScrollArea className="w-full whitespace-nowrap rounded-md border" ref={scrollAreaRef}>
      <div className="flex gap-2 p-2">
        {scenes.map((scene, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={scene.id}
              ref={isActive ? activeRef : null}
              onClick={() => onSceneClick(scene)}
              className={cn(
                "group relative flex flex-col items-center gap-1 rounded-md p-1 transition-all",
                isActive
                  ? "ring-2 ring-primary ring-offset-1 scale-105"
                  : "hover:bg-accent"
              )}
            >
              {/* Keyframe thumbnail */}
              <div className="relative h-12 w-20 overflow-hidden rounded bg-muted">
                {scene.keyframe_url ? (
                  <Image
                    src={scene.keyframe_url}
                    alt={`Scene ${scene.shot_index}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                {isActive && (
                  <div className="absolute inset-0 bg-primary/10" />
                )}
              </div>

              {/* Timestamp badge */}
              <Badge
                variant={isActive ? "default" : "outline"}
                className="h-4 px-1 text-[10px]"
              >
                {formatTimestamp(scene.timestamp_start)}
              </Badge>
            </button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
