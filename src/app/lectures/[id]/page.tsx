"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Send, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProcessingStatus } from "@/components/lecture/ProcessingStatus";
import { LecturePlayer } from "@/components/lecture/LecturePlayer";
import { getLecture, createChatSession, sendChatMessage } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useAuthStore } from "@/store/useAuthStore";
import { formatTimestamp, formatDuration } from "@/lib/utils";
import type { Scene } from "@/types/api";

// ─── Transcript Panel ─────────────────────────────────────────────────────────

function TranscriptPanel({
  scenes,
  currentTimestamp,
  onSceneClick,
}: {
  scenes: Scene[];
  currentTimestamp: number;
  onSceneClick: (scene: Scene) => void;
}) {
  const activeIndex = [...scenes]
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.timestamp_start <= currentTimestamp)
    .pop()?.i ?? 0;

  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [activeIndex]);

  if (scenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-8">
        <p className="text-sm text-muted-foreground">Chưa có transcript</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-3">
        {scenes.map((scene, i) => {
          const isActive = i === activeIndex;
          const text = scene.transcript ?? scene.ocr_text;
          return (
            <div
              key={scene.id}
              ref={(el) => { itemRefs.current[i] = el; }}
              onClick={() => onSceneClick(scene)}
              className={`flex gap-3 rounded-md px-3 py-2 cursor-pointer transition-colors text-sm ${
                isActive
                  ? "bg-primary/10 border border-primary/30"
                  : "hover:bg-accent"
              }`}
            >
              <span className="shrink-0 tabular-nums text-xs text-muted-foreground mt-0.5 w-10">
                {formatTimestamp(scene.timestamp_start)}
              </span>
              <p className={`leading-snug flex-1 ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {text ?? <span className="italic opacity-50">...</span>}
              </p>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// ─── Mini Chat Box ─────────────────────────────────────────────────────────────

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

function MiniChatBox({ lectureId, courseId }: { lectureId: string; courseId?: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      if (!sessionIdRef.current) {
        const session = await createChatSession({
          user_id: user?.id,
          course_id: courseId,
        });
        sessionIdRef.current = session.id;
      }
      const res = await sendChatMessage(sessionIdRef.current, {
        content: text,
        role: "user",
      });
      setMessages((m) => [...m, { role: "assistant", content: res.content }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Xảy ra lỗi, vui lòng thử lại." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card flex flex-col" style={{ height: 220 }}>
      <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0">
        <MessageSquare className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Hỏi đáp về bài giảng</span>
      </div>

      <ScrollArea className="flex-1 px-4 py-2">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Đặt câu hỏi về nội dung video...</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`mb-2 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-lg px-3 py-1.5 text-sm ${
              m.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start mb-2">
            <div className="bg-muted rounded-lg px-3 py-1.5 text-sm text-muted-foreground animate-pulse">
              Đang trả lời...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </ScrollArea>

      <div className="flex gap-2 px-3 py-2 border-t shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Hỏi về video này..."
          className="flex-1 rounded-md border bg-background px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
          disabled={loading}
        />
        <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSend} disabled={loading || !input.trim()}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function LectureContent({ lectureId }: { lectureId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTimestamp = Number(searchParams.get("t") ?? 0);
  const courseId = searchParams.get("courseId") ?? undefined;

  const { data: lecture, isLoading, error } = useQuery({
    queryKey: queryKeys.lectures.detail(lectureId),
    queryFn: () => getLecture(lectureId),
    enabled: !!lectureId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || status === "COMPLETED" || status === "FAILED") return false;
      return 5_000;
    },
  });

  const { currentTimestamp, seekTo } = usePlayerStore();

  const handleSceneClick = useCallback(
    (scene: Scene) => seekTo(scene.timestamp_start),
    [seekTo]
  );

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <Skeleton className="aspect-video w-full rounded-lg" />
          </div>
          <div className="lg:col-span-2 space-y-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !lecture) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          Không tải được bài giảng. Vui lòng kiểm tra kết nối.
        </div>
        <Button variant="ghost" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Quay lại
        </Button>
      </div>
    );
  }

  const isProcessing = lecture.status !== "COMPLETED" && lecture.status !== "FAILED";

  return (
    <div className="container mx-auto py-4 px-4 md:px-6 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Quay lại
        </Button>
        <StatusBadge status={lecture.status} />
      </div>

      <div>
        <h1 className="text-lg font-bold line-clamp-2">{lecture.title}</h1>
        <div className="flex items-center gap-3 mt-0.5 text-sm text-muted-foreground">
          {lecture.duration_sec != null && lecture.duration_sec > 0 && (
            <span>{formatDuration(lecture.duration_sec)}</span>
          )}
          {lecture.scenes.length > 0 && (
            <span>{lecture.scenes.length} cảnh</span>
          )}
        </div>
      </div>

      {isProcessing && (
        <ProcessingStatus taskId={lectureId} lectureId={lectureId} />
      )}

      {/* Main grid: Player + Transcript */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Video Player */}
        <div className="lg:col-span-3">
          <LecturePlayer
            videoUrl={lecture.video_url ?? ""}
            initialTimestamp={initialTimestamp}
            lectureId={lectureId}
          />
        </div>

        {/* Right: Transcript/Slide panel */}
        <div className="lg:col-span-2 rounded-lg border bg-card" style={{ height: 420 }}>
          <div className="px-4 py-2 border-b text-sm font-medium">
            Transcript
          </div>
          <div className="h-[calc(100%-41px)]">
            <TranscriptPanel
              scenes={lecture.scenes}
              currentTimestamp={currentTimestamp}
              onSceneClick={handleSceneClick}
            />
          </div>
        </div>
      </div>

      {/* Below: Mini Chat */}
      <MiniChatBox lectureId={lectureId} courseId={courseId} />
    </div>
  );
}

export default function LecturePlayerPage() {
  const params = useParams<{ id: string }>();
  const lectureId = params.id;

  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 px-4 md:px-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="aspect-video w-full rounded-lg" />
        </div>
      }
    >
      <LectureContent lectureId={lectureId} />
    </Suspense>
  );
}
