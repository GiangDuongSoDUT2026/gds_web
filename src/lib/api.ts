import axios, { type AxiosProgressEvent } from "axios";
import type {
  Program,
  Course,
  Chapter,
  LectureVideo,
  JobStatus,
  UploadResponse,
  SearchResponse,
  SearchParams,
  ChatSession,
  ChatMessageResponse,
  CreateProgramInput,
  CreateCourseInput,
  CreateChapterInput,
  CreateSessionParams,
  SendMessageParams,
  User,
  TokenResponse,
  LoginParams,
  RegisterParams,
  Organization,
  ChatUploadResponse,
  ProgressUpdate,
  LectureProgress,
  LearningStats,
  RecommendedLecture,
  Notification,
} from "@/types/api";

// ─── Axios Instance ───────────────────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30_000,
});

// ─── Auth token interceptor ───────────────────────────────────────────────────

apiClient.interceptors.request.use((config) => {
  // Read token directly from localStorage to avoid circular dependency with zustand store
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("gds-auth");
    if (stored) {
      try {
        const { state } = JSON.parse(stored) as { state: { accessToken?: string } };
        if (state?.accessToken) {
          config.headers.Authorization = `Bearer ${state.accessToken}`;
        }
      } catch {
        // ignore malformed storage
      }
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const message =
        (error.response?.data as { detail?: string })?.detail ??
        error.message ??
        "An unexpected error occurred";
      return Promise.reject(new Error(message));
    }
    return Promise.reject(error);
  }
);

// ─── Health ───────────────────────────────────────────────────────────────────

export async function getHealth(): Promise<{ status: string }> {
  const { data } = await apiClient.get<{ status: string }>("/api/v1/health");
  return data;
}

// ─── Programs ─────────────────────────────────────────────────────────────────

export async function getPrograms(): Promise<Program[]> {
  const { data } = await apiClient.get<Program[]>("/api/v1/programs");
  return data;
}

export async function getProgram(id: string): Promise<Program> {
  const { data } = await apiClient.get<Program>(`/api/v1/programs/${id}`);
  return data;
}

export async function createProgram(input: CreateProgramInput): Promise<Program> {
  const { data } = await apiClient.post<Program>("/api/v1/programs", input);
  return data;
}

// ─── Courses ──────────────────────────────────────────────────────────────────

export async function getCoursesByProgram(programId: string): Promise<Course[]> {
  const { data } = await apiClient.get<Course[]>(
    `/api/v1/programs/${programId}/courses`
  );
  return data;
}

export async function createCourse(
  programId: string,
  input: CreateCourseInput
): Promise<Course> {
  const { data } = await apiClient.post<Course>(
    `/api/v1/programs/${programId}/courses`,
    input
  );
  return data;
}

// ─── Chapters ─────────────────────────────────────────────────────────────────

export async function getChaptersByCourse(courseId: string): Promise<Chapter[]> {
  const { data } = await apiClient.get<Chapter[]>(
    `/api/v1/courses/${courseId}/chapters`
  );
  return data;
}

export async function createChapter(
  courseId: string,
  input: CreateChapterInput
): Promise<Chapter> {
  const { data } = await apiClient.post<Chapter>(
    `/api/v1/courses/${courseId}/chapters`,
    input
  );
  return data;
}

// ─── Lectures ─────────────────────────────────────────────────────────────────

export async function getLecturesByChapter(
  chapterId: string
): Promise<LectureVideo[]> {
  const { data } = await apiClient.get<LectureVideo[]>(
    `/api/v1/lectures/?chapter_id=${chapterId}`
  );
  return data;
}

export async function getLecture(id: string): Promise<LectureVideo> {
  const { data } = await apiClient.get<LectureVideo>(`/api/v1/lectures/${id}`);
  return data;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export async function uploadVideo(
  formData: FormData,
  onProgress?: (percentage: number) => void
): Promise<UploadResponse> {
  const { data } = await apiClient.post<UploadResponse>(
    "/api/v1/upload/video",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentage = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentage);
        }
      },
    }
  );
  return data;
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export async function getJob(taskId: string): Promise<JobStatus> {
  const { data } = await apiClient.get<JobStatus>(`/api/v1/jobs/${taskId}`);
  return data;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function search(params: SearchParams): Promise<SearchResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set("q", params.q);
  searchParams.set("mode", params.mode);
  if (params.course_id) searchParams.set("course_id", params.course_id);
  if (params.limit !== undefined)
    searchParams.set("limit", String(params.limit));
  if (params.offset !== undefined)
    searchParams.set("offset", String(params.offset));

  const { data } = await apiClient.get<SearchResponse>(
    `/api/v1/search/?${searchParams.toString()}`
  );
  return data;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export async function createChatSession(
  params: CreateSessionParams
): Promise<ChatSession> {
  const { data } = await apiClient.post<ChatSession>(
    "/chat/chat/sessions",
    params
  );
  return data;
}

export async function sendChatMessage(
  sessionId: string,
  params: SendMessageParams
): Promise<ChatMessageResponse> {
  const { data } = await apiClient.post<ChatMessageResponse>(
    `/chat/chat/sessions/${sessionId}/messages`,
    params
  );
  return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(params: LoginParams): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/api/v1/auth/login", params);
  return data;
}

export async function register(params: RegisterParams): Promise<User> {
  const { data } = await apiClient.post<User>("/api/v1/auth/register", params);
  return data;
}

export async function getMe(token?: string): Promise<User> {
  const { data } = await apiClient.get<User>("/api/v1/auth/me",
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );
  return data;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/api/v1/auth/refresh", {
    refresh_token: refreshToken,
  });
  return data;
}

export async function getOrganizations(): Promise<Organization[]> {
  const { data } = await apiClient.get<Organization[]>("/api/v1/organizations/");
  return data;
}

// ─── Bulk Upload ───────────────────────────────────────────────────────────────

export async function uploadVideoBulk(
  files: File[],
  chapterId: string,
  onProgress?: (percentage: number) => void
): Promise<{ batch_id: string; total: number; items: unknown[] }> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  formData.append("chapter_id", chapterId);

  const { data } = await apiClient.post("/api/v1/upload/videos", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e: AxiosProgressEvent) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
  return data;
}

export async function getBatchStatus(batchId: string) {
  const { data } = await apiClient.get(`/api/v1/upload/batches/${batchId}`);
  return data;
}

export async function chatUpload(
  files: File[],
  chapterId: string,
  onProgress?: (percentage: number) => void
): Promise<ChatUploadResponse> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  formData.append("chapter_id", chapterId);

  const { data } = await apiClient.post<ChatUploadResponse>(
    "/api/v1/upload/chat-upload",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e: AxiosProgressEvent) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    }
  );
  return data;
}

// ─── Learning Progress ────────────────────────────────────────────────────────

export async function updateProgress(lectureId: string, data: ProgressUpdate): Promise<void> {
  await apiClient.post(`/api/v1/progress/${lectureId}`, data);
}

export async function getMyProgress(): Promise<LectureProgress[]> {
  const { data } = await apiClient.get<LectureProgress[]>("/api/v1/progress/");
  return data;
}

export async function getLearningStats(): Promise<LearningStats> {
  const { data } = await apiClient.get<LearningStats>("/api/v1/progress/stats");
  return data;
}

export async function getRecommendations(): Promise<RecommendedLecture[]> {
  const { data } = await apiClient.get<RecommendedLecture[]>("/api/v1/progress/recommendations");
  return data;
}

export async function logLearningEvent(event: {
  event_type: string;
  lecture_id?: string;
  scene_id?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  await apiClient.post("/api/v1/progress/events", event);
}

// ─── Pipeline Notifications ────────────────────────────────────────────────────

export async function getNotifications(): Promise<Notification[]> {
  const { data } = await apiClient.get<Notification[]>("/api/v1/pipeline/notifications");
  return data;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await apiClient.patch(`/api/v1/pipeline/notifications/${notificationId}/read`);
}
