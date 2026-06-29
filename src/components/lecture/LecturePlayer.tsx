"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useAuthStore } from "@/store/useAuthStore";
import { updateProgress, logLearningEvent } from "@/lib/api";
import { toProxiedUrl } from "@/lib/utils";

// react-player must be dynamically imported to avoid SSR issues
const ReactPlayer = dynamic(() => import("react-player/lazy"), {
  ssr: false,
  loading: () => (
    <Skeleton className="aspect-video w-full rounded-lg" />
  ),
});

interface LecturePlayerProps {
  videoUrl: string;
  initialTimestamp?: number;
  onTimeUpdate?: (timestamp: number) => void;
  lectureId?: string;
}

export function LecturePlayer({
  videoUrl,
  initialTimestamp = 0,
  onTimeUpdate,
  lectureId,
}: LecturePlayerProps) {
  const playerRef = useRef<{ seekTo: (amount: number, type?: string) => void } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const hasSeekedInitial = useRef(false);

  const { seekTarget, clearSeekTarget, setCurrentTimestamp, isPlaying, setIsPlaying } =
    usePlayerStore();
  const { isAuthenticated } = useAuthStore();

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchedSecondsRef = useRef(0);
  const lastReportedRef = useRef(0);

  // Handle seek requests from store
  useEffect(() => {
    if (seekTarget !== null && isReady && playerRef.current) {
      playerRef.current.seekTo(seekTarget, "seconds");
      clearSeekTarget();
    }
  }, [seekTarget, isReady, clearSeekTarget]);

  // Seek to initial timestamp once the player is ready
  const handleReady = useCallback(() => {
    setIsReady(true);
    if (initialTimestamp > 0 && !hasSeekedInitial.current && playerRef.current) {
      playerRef.current.seekTo(initialTimestamp, "seconds");
      hasSeekedInitial.current = true;
    }
  }, [initialTimestamp]);

  const handleProgress = useCallback(
    (state: { playedSeconds: number }) => {
      setCurrentTimestamp(state.playedSeconds);
      onTimeUpdate?.(state.playedSeconds);
      // Accumulate watched seconds (only when playing forward, not seeking)
      if (Math.abs(state.playedSeconds - lastReportedRef.current) < 5) {
        watchedSecondsRef.current += 0.5; // react-player calls every ~0.5s
      }
      lastReportedRef.current = state.playedSeconds;
    },
    [setCurrentTimestamp, onTimeUpdate]
  );

  // Evaluate once — avoid using function reference as effect dependency
  const isAuth = isAuthenticated();

  // Report progress every 30 seconds
  useEffect(() => {
    if (!isAuth || !lectureId) return;
    progressIntervalRef.current = setInterval(async () => {
      if (watchedSecondsRef.current > 0) {
        try {
          await updateProgress(lectureId, {
            position_sec: lastReportedRef.current,
            watched_seconds: watchedSecondsRef.current,
          });
          await logLearningEvent({ event_type: "watch", lecture_id: lectureId });
        } catch (err) {
          console.error("[LecturePlayer] updateProgress failed:", err);
        }
      } else {
        console.debug("[LecturePlayer] interval fired but watchedSeconds=0, pos=", lastReportedRef.current);
      }
    }, 10_000);
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [lectureId, isAuth]);

  // Mark completed when video ends
  const handleEnded = useCallback(async () => {
    setIsPlaying(false);
    if (!isAuth || !lectureId) return;
    try {
      await updateProgress(lectureId, {
        position_sec: 0,
        watched_seconds: watchedSecondsRef.current,
        completed: true,
      });
    } catch { /* silent fail */ }
  }, [lectureId, isAuth, setIsPlaying]);

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-black">
      {isBuffering && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
        </div>
      )}
      <div className="aspect-video w-full">
        <ReactPlayer
          ref={playerRef as React.Ref<unknown>}
          url={(() => {
            const base = videoUrl.includes("drive.google.com") || videoUrl.includes("docs.google.com") ? videoUrl : toProxiedUrl(videoUrl);
            return initialTimestamp > 0 ? `${base}#t=${initialTimestamp}` : base;
          })()}
          width="100%"
          height="100%"
          controls
          playing={isPlaying}
          onReady={handleReady}
          onProgress={handleProgress}
          onBuffer={() => setIsBuffering(true)}
          onBufferEnd={() => setIsBuffering(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={handleEnded}
          progressInterval={500}
          config={{
            file: {
              attributes: {},
            },
          }}
        />
      </div>
    </div>
  );
}
