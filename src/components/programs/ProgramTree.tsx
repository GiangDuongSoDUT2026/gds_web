"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, BookOpen, Video, GraduationCap, List } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  getPrograms,
  getCoursesByProgram,
  getChaptersByCourse,
  getLecturesByChapter,
} from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import type { Program, Course, Chapter } from "@/types/api";

// ─── Lecture list (leaf) ─────────────────────────────────────────────────────

function LectureList({ chapterId }: { chapterId: string }) {
  const { data: lectures, isLoading } = useQuery({
    queryKey: queryKeys.lectures.byChapter(chapterId),
    queryFn: () => getLecturesByChapter(chapterId),
  });

  if (isLoading) return <Skeleton className="ml-8 h-6 w-32" />;

  return (
    <div className="ml-8 space-y-1">
      {lectures?.map((lecture) => (
        <Link
          key={lecture.id}
          href={`/lectures/${lecture.id}`}
          className="flex items-center justify-between gap-2 rounded-sm px-2 py-1 text-xs hover:bg-accent transition-colors"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Video className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="truncate">{lecture.title}</span>
          </div>
          <StatusBadge status={lecture.status} className="shrink-0 text-[10px]" />
        </Link>
      ))}
    </div>
  );
}

// ─── Chapter item ─────────────────────────────────────────────────────────────

function ChapterItem({ chapter }: { chapter: Chapter }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 rounded-sm px-2 py-1 text-xs hover:bg-accent transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <List className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="truncate">{chapter.order_index}. {chapter.title}</span>
      </button>
      {isOpen && <LectureList chapterId={chapter.id} />}
    </div>
  );
}

// ─── Course item ──────────────────────────────────────────────────────────────

function CourseItem({ course }: { course: Course }) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: chapters, isLoading } = useQuery({
    queryKey: queryKeys.chapters.byCourse(course.id),
    queryFn: () => getChaptersByCourse(course.id),
    enabled: isOpen,
  });

  return (
    <div>
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 rounded-sm px-2 py-1 text-xs hover:bg-accent transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <BookOpen className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-left">{course.code} — {course.name}</span>
      </button>
      {isOpen && (
        <div className="ml-4 mt-0.5 space-y-0.5">
          {isLoading && <Skeleton className="h-5 w-full" />}
          {chapters
            ?.slice()
            .sort((a, b) => a.order_index - b.order_index)
            .map((chapter) => (
              <ChapterItem key={chapter.id} chapter={chapter} />
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Program item ─────────────────────────────────────────────────────────────

function ProgramItem({ program }: { program: Program }) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: courses, isLoading } = useQuery({
    queryKey: queryKeys.courses.byProgram(program.id),
    queryFn: () => getCoursesByProgram(program.id),
    enabled: isOpen,
  });

  return (
    <div className="border-b last:border-0">
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <GraduationCap className="h-4 w-4 shrink-0 text-primary" />
        <span className="flex-1 truncate text-left">{program.name}</span>
        {courses && (
          <Badge variant="secondary" className="text-xs">
            {courses.length}
          </Badge>
        )}
      </button>

      {isOpen && (
        <div className="ml-4 mb-2 space-y-0.5">
          {isLoading && <Skeleton className="h-5 w-full" />}
          {courses?.map((course) => (
            <CourseItem key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Root ProgramTree ─────────────────────────────────────────────────────────

export function ProgramTree() {
  const { data: programs, isLoading, error } = useQuery({
    queryKey: queryKeys.programs.all(),
    queryFn: getPrograms,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="p-3 text-sm text-destructive">
        Failed to load programs
      </p>
    );
  }

  if (!programs || programs.length === 0) {
    return (
      <p className="p-3 text-sm text-muted-foreground">
        No programs yet
      </p>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      {programs.map((program) => (
        <ProgramItem key={program.id} program={program} />
      ))}
    </div>
  );
}
