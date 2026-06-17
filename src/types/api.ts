// ─── Core Domain Types ──────────────────────────────────────────────────────

export interface Program {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Course {
  id: string;
  program_id: string;
  name: string;
  code: string | null;
  description: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Chapter {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  lecture_count: number;
  created_at: string;
  updated_at?: string;
}

export interface Scene {
  id: string;
  lecture_id: string;
  shot_index: number;
  timestamp_start: number;
  timestamp_end: number;
  transcript: string | null;
  ocr_text: string | null;
  visual_tags: string[] | null;
  keyframe_url: string | null;
}

export type LectureStatus =
  | "PENDING"
  | "QUEUED_FOR_GPU"
  | "DOWNLOADING"
  | "SCENE_DETECTING"
  | "ASR"
  | "OCR"
  | "EMBEDDING"
  | "COMPLETED"
  | "FAILED";

export interface LectureVideo {
  id: string;
  title: string;
  status: LectureStatus;
  fps: number | null;
  duration_sec: number | null;
  chapter_id: string;
  scenes: Scene[];
  video_url: string | null;
  created_at: string;
  updated_at?: string;
}

// ─── Job Status ──────────────────────────────────────────────────────────────

export type JobStatusValue =
  | "PENDING"
  | "STARTED"
  | "SUCCESS"
  | "FAILURE"
  | "RETRY";

export interface JobStatus {
  task_id: string;
  status: JobStatusValue;
  result: unknown;
  error: string | null;
}

// ─── Upload ──────────────────────────────────────────────────────────────────

export interface UploadResponse {
  lecture_id: string;
  task_id: string;
  status: string;
  message: string;
  eta_minutes?: number;
}

export interface BulkUploadResponse {
  batch_id: string;
  total: number;
  accepted?: number;
  rejected?: number;
  items: unknown[];
  message: string;
  eta_minutes?: number;
}

export interface ChatUploadResponse {
  batch_id: string;
  message: string;
  accepted: number;
  rejected: number;
  total: number;
  eta_minutes: number;
  items: unknown[];
}

// ─── Search ──────────────────────────────────────────────────────────────────

export type SearchMode = "keyword" | "semantic";

export interface SearchResult {
  scene_id: string;
  lecture_id: string;
  lecture_title: string;
  chapter_title: string;
  course_name: string;
  timestamp_start: number;
  timestamp_end: number;
  transcript: string | null;
  ocr_text: string | null;
  keyframe_url: string | null;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  mode: string;
}

export interface SearchParams {
  q: string;
  mode: SearchMode;
  course_id?: string;
  limit?: number;
  offset?: number;
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export interface Citation {
  lecture_title: string;
  chapter_title: string;
  timestamp_start: number;
  timestamp_end: number;
  keyframe_url: string | null;
  deep_link: string;
  lecture_id?: string;
  video_url?: string | null;
}

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  citations?: Citation[];
  tool_calls_used?: string[];
  cards?: ChatCard[];
  created_at?: string;
}

export interface ChatSession {
  id: string;
  user_id: string | null;
  course_id: string | null;
  created_at: string;
}

export interface ChatMessageResponse {
  role: MessageRole;
  content: string;
  citations: Citation[];
  tool_calls_used: string[];
}

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface CreateProgramInput {
  name: string;
  description: string;
}

export interface CreateCourseInput {
  name: string;
  code: string;
  description: string;
}

export interface CreateChapterInput {
  title: string;
  order_index: number;
}

export interface CreateSessionParams {
  user_id?: string;
  course_id?: string;
}

export interface SendMessageParams {
  content: string;
  role: "user";
}

// ─── WebSocket Message Types ──────────────────────────────────────────────────

export interface WsTokenMessage {
  type: "token";
  content: string;
}

export interface WsDoneMessage {
  type: "done";
}

export interface WsCitationsMessage {
  type: "citations";
  citations: Citation[];
}

export interface WsToolCallMessage {
  type: "tool_call";
  tool: string;
}

export interface WsErrorMessage {
  type: "error";
  message: string;
}

// ─── Chat Cards ──────────────────────────────────────────────────────────────

export interface StatMetric {
  label: string;
  value: number | string;
  icon?: string;
  color?: "green" | "red" | "blue" | "orange";
}

export interface StatsCard {
  __card_type: "stats";
  title: string;
  metrics: StatMetric[];
}

export interface TableCard {
  __card_type: "table";
  title: string;
  columns: string[];
  rows: (string | number)[][];
}

export type ChatCard = StatsCard | TableCard;

export interface WsCardMessage {
  type: "card";
  data: ChatCard;
}

export type WsMessage =
  | WsTokenMessage
  | WsDoneMessage
  | WsCitationsMessage
  | WsToolCallMessage
  | WsErrorMessage
  | WsCardMessage;

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = "SUPER_ADMIN" | "SCHOOL_ADMIN" | "FACULTY_ADMIN" | "TEACHER" | "STUDENT";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  organization_id: string | null;
  faculty: string | null;
  department: string | null;
  teacher_code: string | null;
  major: string | null;
  student_code: string | null;
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginParams {
  email: string;
  password: string;
}

export interface RegisterParams {
  email: string;
  password: string;
  full_name: string;
  role?: UserRole;
  organization_id?: string;
  faculty?: string;
  department?: string;
  teacher_code?: string;
  major?: string;
  student_code?: string;
}

export interface Organization {
  id: string;
  name: string;
  short_name: string | null;
  created_at: string;
}

// ─── Learning Progress ────────────────────────────────────────────────────────

export interface ProgressUpdate {
  position_sec: number;
  watched_seconds: number;
  completed?: boolean;
  scenes_viewed?: string[];
}

export interface LectureProgress {
  lecture_id: string;
  lecture_title: string;
  watched_seconds: number;
  duration_sec: number | null;
  percent: number;
  completed: boolean;
  last_position_sec: number;
  last_watched_at: string | null;
  course_name: string;
  chapter_title: string;
}

export interface LearningStats {
  total_watched_seconds: number;
  total_hours: number;
  completed_lectures: number;
  in_progress_lectures: number;
  total_scenes_viewed: number;
  most_active_course: string | null;
  streak_days: number;
}

export interface RecommendedLecture {
  lecture_id: string;
  lecture_title: string;
  course_name: string;
  chapter_title: string;
  reason: "continue" | "next_in_chapter" | "related_topic" | "new";
  progress_percent: number;
  last_position_sec: number;
  duration_sec: number | null;
  keyframe_url: string | null;
}

// ─── Pipeline Notifications ───────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: "processing_done" | "processing_failed" | "queued";
  title: string;
  body: string | null;
  ref_type: "lecture" | "job" | null;
  ref_id: string | null;
  is_read: boolean;
  created_at: string;
}

// ─── SSE Processing Stream ────────────────────────────────────────────────────

export type ProcessingJobStatus =
  | "PENDING"
  | "QUEUED_FOR_GPU"
  | "DISPATCHED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "NOT_FOUND";

export interface ProcessingStreamEvent {
  status: ProcessingJobStatus;
  progress: number;   // 0-100
  stage: string | null;
}

// ─── Admin GPU Queue ──────────────────────────────────────────────────────────

export interface AdminProcessingJob {
  id: string;
  lecture_id: string;
  lecture_title: string | null;
  status: ProcessingJobStatus;
  progress_pct: number;
  current_stage: string | null;
  assigned_session_id: string | null;
  error_text: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface AdminGpuSession {
  id: string;
  session_type: "kaggle" | "colab" | "local";
  status: string;
  is_online: boolean;
  last_heartbeat: string | null;
  notebook_url: string | null;
  current_job_id: string | null;
  created_at: string;
}

export interface GpuQueueStats {
  today: Record<string, number>;
  gpu_sessions_online: number;
}
