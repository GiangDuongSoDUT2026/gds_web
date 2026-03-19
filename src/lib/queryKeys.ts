import type { SearchParams } from "@/types/api";

export const queryKeys = {
  programs: {
    all: () => ["programs"] as const,
    detail: (id: string) => ["programs", id] as const,
  },
  courses: {
    byProgram: (programId: string) =>
      ["courses", "program", programId] as const,
    detail: (id: string) => ["courses", id] as const,
  },
  chapters: {
    byCourse: (courseId: string) =>
      ["chapters", "course", courseId] as const,
  },
  lectures: {
    byChapter: (chapterId: string) =>
      ["lectures", "chapter", chapterId] as const,
    detail: (id: string) => ["lectures", id] as const,
  },
  search: {
    results: (params: Partial<SearchParams>) =>
      ["search", params] as const,
  },
  jobs: {
    detail: (taskId: string) => ["jobs", taskId] as const,
  },
  chat: {
    sessions: () => ["chat", "sessions"] as const,
    session: (id: string) => ["chat", "sessions", id] as const,
  },
} as const;
