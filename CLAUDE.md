# CLAUDE.md — GDS Web (Frontend)

Hướng dẫn cho Claude Code khi làm việc với frontend này.
**QUAN TRỌNG:** Mọi thay đổi liên quan đến API call, kiểu dữ liệu, URL phải khớp với backend contract bên dưới.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **TanStack React Query** — data fetching & caching
- **Axios** — HTTP client (`src/lib/api.ts`)
- **Zustand** — state management (`src/store/`)
- **Shadcn/ui** + Tailwind CSS

## Cấu trúc thư mục

```
src/
├── app/           # Next.js App Router pages
├── components/    # React components
├── hooks/         # Custom hooks (useWebSocket, useBatchPolling, useJobPolling)
├── lib/           # api.ts (Axios client), queryKeys.ts, utils.ts
├── store/         # Zustand stores (useAuthStore, useChatStore, usePlayerStore, useUploadStore)
└── types/         # api.ts — tất cả TypeScript types (phải khớp backend)
```

## Quy tắc bắt buộc

1. **Types trong `src/types/api.ts` là nguồn sự thật** — chỉ sửa khi backend thay đổi contract
2. **Mọi API call phải qua `apiClient`** trong `src/lib/api.ts` — không dùng `fetch` trực tiếp
3. **Không tự bịa field hay endpoint** — chỉ dùng những gì đã documented bên dưới
4. **Auth token tự động** — `apiClient` interceptor tự đọc từ localStorage `gds-auth`

---

## Backend API Contract

### Base URLs

| Service | URL | Cách kết nối |
|---|---|---|
| API (REST) | `http://localhost:8080` | Next.js rewrite `/api/v1/*` |
| Chatbot | `http://localhost:8002` | Next.js rewrite `/chat/*` |
| WebSocket | `ws://localhost:8002` | Trực tiếp (không rewrite được) |

**Storage URLs (production — Google Drive):**
- Video URL: trả về trực tiếp từ backend (`video_url` field trong LectureVideo)
- Keyframe URL: trả về trực tiếp từ backend (`keyframe_url` field trong Scene / SearchResult)
- Không tự construct URL từ bucket — luôn dùng URL backend trả về

---

### AUTH — `/api/v1/auth`

```
POST /auth/register          → 201 UserResponse        (STUDENT/TEACHER tự đăng ký)
POST /auth/login             → TokenResponse
POST /auth/refresh           → TokenResponse
GET  /auth/me                → UserResponse            (cần token)
POST /auth/admin/users       → 201 UserResponse        (SCHOOL_ADMIN+)
POST /auth/courses/{id}/enroll   → 204               (STUDENT tự enroll)
POST /auth/courses/{id}/teachers → 204               (SCHOOL_ADMIN+)
```

**TokenResponse:**
```typescript
{ access_token: string; refresh_token: string; token_type: string }
```

**UserResponse:**
```typescript
{
  id: string; email: string; full_name: string;
  role: "SUPER_ADMIN"|"SCHOOL_ADMIN"|"FACULTY_ADMIN"|"TEACHER"|"STUDENT";
  organization_id: string|null; faculty: string|null; department: string|null;
  teacher_code: string|null; major: string|null; student_code: string|null;
  is_active: boolean;
}
```

---

### ORGANIZATIONS — `/api/v1/organizations`

```
GET  /organizations    → Organization[]    (public)
POST /organizations    → Organization      (SUPER_ADMIN)
```

**Organization:** `{ id, name, short_name: string|null }`

---

### PROGRAMS / COURSES / CHAPTERS — `/api/v1/programs`

```
GET    /programs                          → Program[]
POST   /programs                          → 201 Program
GET    /programs/{id}                     → Program
PATCH  /programs/{id}                     → Program     (SCHOOL_ADMIN+)
DELETE /programs/{id}                     → 204         (SCHOOL_ADMIN+)

GET    /programs/{id}/courses             → Course[]
POST   /programs/{id}/courses             → 201 Course

PATCH  /courses/{id}                      → Course      (FACULTY_ADMIN+)
DELETE /courses/{id}                      → 204         (FACULTY_ADMIN+)

GET    /courses/{id}/chapters             → Chapter[]   (sorted by order_index)
POST   /courses/{id}/chapters             → 201 Chapter

PATCH  /chapters/{id}                     → Chapter     (TEACHER+)
DELETE /chapters/{id}                     → 204         (TEACHER+)
```

**Types:**
```typescript
Program  = { id, name, description: string|null, created_at: string }
Course   = { id, program_id, name, code: string|null, description: string|null, created_at: string }
Chapter  = { id, course_id, title, order_index: number, created_at: string }
```

---

### LECTURES — `/api/v1/lectures`

```
GET    /lectures?chapter_id={uuid}&limit={n}   → LectureVideo[]
GET    /lectures/{id}                          → LectureVideo
PATCH  /lectures/{id}                          → LectureVideo   (TEACHER+, chỉ sửa title)
DELETE /lectures/{id}                          → 204            (TEACHER+)
```

**LectureVideo:**
```typescript
{
  id: string; title: string; chapter_id: string;
  status: "PENDING"|"DOWNLOADING"|"SCENE_DETECTING"|"ASR"|"OCR"|"EMBEDDING"|"COMPLETED"|"FAILED";
  fps: number|null; duration_sec: number|null;
  video_url: string|null;    // http://localhost:8000/files/videos/{key}
  scenes: Scene[];
  created_at: string;
}
```

**Scene:**
```typescript
{
  id: string; shot_index: number;
  timestamp_start: number; timestamp_end: number;  // seconds
  transcript: string|null; ocr_text: string|null;
  visual_tags: string[]|null;
  keyframe_url: string|null;   // http://localhost:8000/files/frames/{key}
}
```

---

### UPLOAD — `/api/v1/upload`

```
POST /upload/video            multipart: file, chapter_id, title?   → UploadResponse     (TEACHER+)
POST /upload/videos           multipart: files[], chapter_id        → BulkUploadResponse (TEACHER+, max 20)
POST /upload/chat-upload      multipart: files[], chapter_id        → BulkUploadResponse (TEACHER+, max 10)
GET  /upload/batches          → BatchSummary[]                      (TEACHER+)
GET  /upload/batches/{id}     → BatchStatus                         (TEACHER+)
```

**UploadResponse:**
```typescript
{ lecture_id: string; task_id: string; status: "PENDING"; eta_minutes: number; message: string }
```

**BulkUploadResponse:**
```typescript
{
  batch_id: string; total: number; accepted: number; rejected: number;
  items: Array<{
    lecture_id: string; task_id: string; filename: string;
    status: "PENDING"|"REJECTED"|"FAILED";
    file_size_bytes: number; eta_minutes: number;
    error?: string; code?: string;
  }>;
  eta_minutes: number; message: string;
}
```

**BatchStatus** (poll để theo dõi xử lý):
```typescript
{
  batch_id: string;
  status: "PROCESSING"|"COMPLETED"|"PARTIAL";
  total: number; succeeded: number; failed: number; processing: number;
  is_done: boolean;
  items: Array<{
    filename: string; lecture_id: string; task_id: string;
    status: "PENDING"|"STARTED"|"RETRY"|"COMPLETED"|"FAILED";
    file_size_bytes: number; eta_minutes: number;
  }>;
}
```

Allowed video extensions: `.mp4 .mpeg .mpg .mov .avi .webm .mkv`

---

### SEARCH — `/api/v1/search`

```
GET /search?q=...&mode=keyword&course_id=...&limit=10&offset=0  → SearchResponse
```

**Params:**
```typescript
q: string          // bắt buộc
mode: "keyword"|"semantic"  // mặc định "keyword"
course_id?: string // lọc theo course
limit?: number     // 1–100, mặc định 10
offset?: number    // mặc định 0
```

**SearchResponse:**
```typescript
{
  results: SearchResult[];
  total: number;
  query: string;
  mode: string;
}
```

**SearchResult** (scene-level):
```typescript
{
  scene_id: string; lecture_id: string;
  lecture_title: string; chapter_title: string; course_name: string;
  timestamp_start: number; timestamp_end: number;
  transcript: string|null; ocr_text: string|null;
  keyframe_url: string|null;
  score: number;    // relevance score (0–1 range)
}
```

---

### NOTIFICATIONS — `/api/v1/notifications`

```
GET   /notifications?unread_only=false   → Notification[]
PATCH /notifications/{id}/read           → 204
POST  /notifications/read-all            → 204
```

**Notification:**
```typescript
{
  id: string; type: string; title: string; body: string|null;
  ref_type: string|null; ref_id: string|null;
  is_read: boolean; created_at: string;
}
```

---

### ADMIN — `/api/v1/admin` — FACULTY_ADMIN+

```
GET  /admin/gpu-queue?status=QUEUED_FOR_GPU   → ProcessingJob[]
GET  /admin/gpu-sessions                       → GpuSession[]
GET  /admin/gpu-queue/stats                    → { [status: string]: number }
POST /admin/gpu-queue/{id}/retry               → 204
POST /admin/gpu-queue/{id}/cancel              → 204
```

**ProcessingJob:**
```typescript
{
  id: string; lecture_id: string; lecture_title: string;
  status: "QUEUED_FOR_GPU"|"DISPATCHED"|"RUNNING"|"COMPLETED"|"FAILED"|"PENDING";
  progress_pct: number; current_stage: string|null;
  assigned_session_id: string|null; error_text: string|null;
  created_at: string; started_at: string|null; completed_at: string|null;
}
```

**GpuSession:**
```typescript
{
  id: string; session_type: "kaggle"|"colab"|"local";
  last_heartbeat: string; current_job_id: string|null;
  notebook_url: string|null; status: "active"|"inactive";
}
```

---

### SSE PROGRESS STREAM — `/api/v1/lectures/{id}/progress-stream`

```
GET /lectures/{id}/progress-stream   → EventSource (text/event-stream)
```

Events (JSON data):
```typescript
{ status: string; progress: number; stage: string|null }
```

Stream tự đóng khi `status === "COMPLETED" || status === "FAILED"`.

```typescript
// Ví dụ usage:
const es = new EventSource(`/api/v1/lectures/${id}/progress-stream`, {
  headers: { Authorization: `Bearer ${token}` }
});
es.onmessage = (e) => {
  const { status, progress, stage } = JSON.parse(e.data);
  if (status === "COMPLETED" || status === "FAILED") es.close();
};
```

---

### JOBS — `/api/v1/jobs`

```
GET /jobs/{task_id}  → JobStatus
```

**JobStatus:**
```typescript
{ task_id: string; status: "PENDING"|"STARTED"|"SUCCESS"|"FAILURE"|"RETRY"; result: unknown; error: string|null }
```

---

### PROGRESS — `/api/v1/progress`

```
POST /progress/{lecture_id}       body: ProgressUpdate  → 204   (gọi mỗi 30s khi xem video)
POST /progress/events             body: EventLog        → 204
GET  /progress/                   → LectureProgress[]
GET  /progress/stats              → LearningStats
GET  /progress/recommendations?limit=8  → RecommendedLecture[]
```

**ProgressUpdate:**
```typescript
{ position_sec: number; watched_seconds: number; completed?: boolean; scenes_viewed?: string[] }
```

**EventLog:**
```typescript
{ event_type: "watch"|"scene_view"|"search"|"chat"; lecture_id?: string; scene_id?: string; payload?: object }
```

**LectureProgress:**
```typescript
{
  lecture_id: string; lecture_title: string;
  watched_seconds: number; duration_sec: number|null;
  percent: number; completed: boolean; last_position_sec: number;
  last_watched_at: string|null; course_name: string; chapter_title: string;
}
```

**LearningStats:**
```typescript
{
  total_watched_seconds: number; total_hours: number;
  completed_lectures: number; in_progress_lectures: number;
  total_scenes_viewed: number; most_active_course: string|null; streak_days: number;
}
```

**RecommendedLecture:**
```typescript
{
  lecture_id: string; lecture_title: string; course_name: string; chapter_title: string;
  reason: "continue"|"next_in_chapter"|"related_topic"|"new";
  progress_percent: number; last_position_sec: number;
  duration_sec: number|null; keyframe_url: string|null;
}
```

---

### CHAT — `/chat` (chatbot service port 8001)

**REST:**
```
POST /chat/sessions                 body: { user_id?, course_id? }  → ChatSession
POST /chat/sessions/{id}/messages   body: { content, role: "user" } → ChatMessageResponse
```

**ChatSession:** `{ id, user_id, course_id, created_at }`

**ChatMessageResponse:**
```typescript
{ role: "assistant"; content: string; citations: Citation[]; tool_calls_used: string[] }
```

**WebSocket:** `ws://localhost:8002/ws/chat/{session_id}?token={access_token}`

Incoming message types:
```typescript
| { type: "token"; content: string }         // streaming text chunk
| { type: "done" }                           // stream finished
| { type: "citations"; citations: Citation[] }
| { type: "card"; data: StatsCard|TableCard }
| { type: "tool_call"; tool: string }
| { type: "error"; message: string }
```

**Citation:**
```typescript
{
  lecture_title: string; chapter_title: string;
  timestamp_start: number; timestamp_end: number;
  keyframe_url: string|null; deep_link: string; lecture_id?: string;
}
```

---

## RBAC — Quyền truy cập theo role

| Tính năng | STUDENT | TEACHER | FACULTY_ADMIN | SCHOOL_ADMIN | SUPER_ADMIN |
|---|---|---|---|---|---|
| Xem/tìm lectures | ✓ | ✓ | ✓ | ✓ | ✓ |
| Upload video | — | ✓ | ✓ | ✓ | ✓ |
| Tạo chapter | — | ✓ | ✓ | ✓ | ✓ |
| Tạo course | — | — | ✓ | ✓ | ✓ |
| Tạo program | — | — | — | ✓ | ✓ |
| Tạo org | — | — | — | — | ✓ |

Frontend check role:
```typescript
const { user } = useAuthStore();
// Dùng helpers đã có trong store:
isTeacherOrAbove()      // role >= TEACHER
isFacultyAdminOrAbove() // role >= FACULTY_ADMIN
isSchoolAdminOrAbove()  // role >= SCHOOL_ADMIN
isSuperAdmin()
```

---

## Lỗi thường gặp

- **401** → token hết hạn → gọi `/auth/refresh` → nếu fail → redirect `/login`
- **403** → sai role → hiển thị "Không có quyền truy cập"
- **404** → resource không tồn tại → redirect hoặc hiển thị empty state
- **422** → validation error → `error.response.data.detail` chứa danh sách lỗi fields

Error response format: `{ detail: string }` (FastAPI default)
Frontend đã handle trong `apiClient.interceptors.response`: extract `error.response?.data?.detail`
