# GDS Web — Frontend Architecture Plan

> Cập nhật: 2026-03-17

---

## 1. Tổng quan

Frontend cho hệ thống AI bài giảng Giảng Đường Số. Giao diện chatbase với phân quyền theo 5 cấp role, video player đồng bộ scene, tìm kiếm keyword/semantic, bulk upload với thông báo nền, và chatbot AI trả kết quả thống kê dạng card.

---

## 2. App Router Structure (Next.js 14)

```
src/app/
├── layout.tsx                  # Root: AuthGuard + Providers + Sidebar + Header
├── page.tsx                    # Dashboard
├── login/page.tsx              # Đăng nhập
├── register/page.tsx           # Đăng ký (STUDENT / TEACHER)
├── programs/
│   ├── page.tsx                # Programs list (+ tạo mới nếu SCHOOL_ADMIN+)
│   └── [id]/page.tsx           # Program detail + courses
├── courses/
│   └── [id]/page.tsx           # Course detail + chapters + lectures
├── lectures/
│   └── [id]/page.tsx           # Video player + scene timeline + transcript
├── upload/
│   └── page.tsx                # Multi-file upload (TEACHER+ only)
├── search/
│   └── page.tsx                # Keyword / semantic search
└── chat/
    └── page.tsx                # Chatbase: [Chat] [Sources*] tabs
```

---

## 3. Component Hierarchy

```
RootLayout
├── AuthGuard (redirect /login nếu chưa đăng nhập)
├── Providers
│   ├── QueryClientProvider
│   ├── Toaster (Sonner)
│   └── BatchPollProvider (poll bulk upload globally)
├── Sidebar
│   ├── NavLinks (Programs, Search, Upload*, Chat)
│   └── UserMenu (role badge, đăng xuất)
├── Header
│   └── UserMenu
└── {page content}
    ├── Dashboard → hero search + quick actions + program list
    ├── ProgramsPage → ProgramCard[] + CreateProgramDialog (SCHOOL_ADMIN+)
    ├── ProgramDetailPage → CourseCard[] + AddCourseDialog (FACULTY_ADMIN+)
    ├── CourseDetailPage → ChapterAccordion[] + LectureListItem[]
    ├── LecturePlayerPage
    │   ├── LecturePlayer (react-player, presigned MinIO URL)
    │   ├── SceneTimeline (click → seekTo)
    │   └── SceneDetail (transcript | OCR | tags tabs)
    ├── UploadPage (TEACHER+ guard)
    │   ├── UploadForm (multi-file dropzone, max 20)
    │   └── BatchStatus (succeeded/failed count)
    ├── SearchPage → SearchBar + SearchResultCard[]
    └── ChatPage (chatbase layout)
        ├── Tab: Chat
        │   ├── MessageList (text + StatCard + TableCard inline)
        │   ├── CitationsSidebar (tự hiện khi có citations)
        │   └── MessageInput + Send
        └── Tab: Sources (TEACHER+ only)
            ├── SearchInput + StatusFilter
            ├── LectureTable (title, status, link xem)
            └── Upload button → /upload
```

---

## 4. State Management

### TanStack Query — Server state
```typescript
queryKeys.programs.all()              → ['programs']
queryKeys.programs.detail(id)         → ['programs', id]
queryKeys.courses.byProgram(id)       → ['courses', 'program', id]
queryKeys.chapters.byCourse(id)       → ['chapters', 'course', id]
queryKeys.lectures.byChapter(id)      → ['lectures', 'chapter', id]
queryKeys.lectures.detail(id)         → ['lectures', id]
queryKeys.search.results(params)      → ['search', params]
queryKeys.jobs.detail(taskId)         → ['jobs', taskId]
```

### Zustand — Client state

**`useAuthStore`** (persist `gds-auth`):
```typescript
user: User | null
accessToken: string | null
refreshToken: string | null
setAuth(user, tokens) / logout()
isAuthenticated() / hasRole(...)
isTeacherOrAbove() / isFacultyAdminOrAbove() / isSuperAdmin()
```

**`useChatStore`**:
```typescript
sessionId: string | null
messages: ChatMessage[]    // each has cards?: ChatCard[]
isStreaming: boolean
addMessage / appendToLastMessage / setLastMessageCitations
addCardToLastMessage(card: ChatCard)
```

**`usePlayerStore`**:
```typescript
currentTimestamp: number
seekTarget: number | null
seekTo(t) / clearSeekTarget()
```

**`useUploadStore`** (batch tracking):
```typescript
batches: Record<batch_id, UploadBatch>
addBatch / updateBatch / markNotified
activeBatches() → batches chưa done
```

---

## 5. API Client (src/lib/api.ts)

Axios instance với:
- Request interceptor: đọc `localStorage["gds-auth"].state.accessToken` → `Authorization: Bearer`
- Response interceptor: normalize errors

### Endpoints

```typescript
// Auth
login(params)          → POST /api/v1/auth/login
register(params)       → POST /api/v1/auth/register
getMe()                → GET  /api/v1/auth/me
refreshAccessToken()   → POST /api/v1/auth/refresh

// Programs / Courses / Chapters (CRUD theo role)
getPrograms()          → GET  /api/v1/programs
createProgram()        → POST /api/v1/programs
getCoursesByProgram()  → GET  /api/v1/programs/{id}/courses
getChaptersByCourse()  → GET  /api/v1/courses/{id}/chapters

// Lectures
getLecture(id)         → GET  /api/v1/lectures/{id}
getLecturesByChapter() → GET  /api/v1/lectures/?chapter_id=

// Upload
uploadVideo()          → POST /api/v1/upload/video       (1 file)
uploadVideoBulk()      → POST /api/v1/upload/videos      (N files)
getBatchStatus()       → GET  /api/v1/upload/batches/{id}

// Jobs
getJob(taskId)         → GET  /api/v1/jobs/{taskId}

// Search
search(params)         → GET  /api/v1/search/?q=&mode=

// Chat
createChatSession()    → POST /chat/chat/sessions
sendChatMessage()      → POST /chat/chat/sessions/{id}/messages
```

---

## 6. Real-time Features

### WebSocket Chat (`useWebSocket.ts`)
- URL: `ws://localhost:80/chat/ws/chat/{sessionId}?token=<jwt>`
- Auto-reconnect: exponential backoff (1s → 2s → 4s → max 30s, 5 lần)
- Message handlers:
  ```
  onToken(content)        → appendToLastMessage
  onToolCall(tool)        → badge indicator
  onCard(card)            → addCardToLastMessage (StatCard / TableCard)
  onCitations(citations)  → setLastMessageCitations + show sidebar
  onDone()                → isStreaming = false
  onError(msg)            → toast.error
  ```

### Batch Upload Polling (`useBatchPolling.ts`)
- Chạy global trong `BatchPollProvider`
- Poll mỗi 5 giây cho các batches chưa `is_done`
- Gọi `GET /api/v1/upload/batches/{id}`
- Khi xong: `toast.success` hoặc `toast.warning` với số liệu

### Job Polling (`useJobPolling.ts`)
- TanStack Query `refetchInterval`
- Poll mỗi 3 giây khi status ∈ `{PENDING, STARTED, RETRY}`
- Dừng khi `SUCCESS | FAILURE`

---

## 7. Chat Cards (StatCard.tsx)

Agent trả về `{"__card_type": "stats"|"table", ...}` qua event `{type: "card"}`.

```tsx
// StatsCard: grid 2-3 cột metric
<StatCard>
  📹 150 bài giảng | ✅ 120 hoàn thành
  ⏳ 20 đang xử lý | ❌ 10 thất bại
  📚 25 môn học    | ⏱ 300.5 giờ
</StatCard>

// TableCard: bảng dữ liệu
<TableCard title="Thống kê theo môn học">
  | Môn học | Mã môn | Bài giảng | Hoàn thành |
</TableCard>
```

---

## 8. Routing & Permissions

| Route | Public | STUDENT | TEACHER+ |
|---|---|---|---|
| `/login`, `/register` | ✅ | ✅ | ✅ |
| `/`, `/programs`, `/search` | ✗* | ✅ | ✅ |
| `/lectures/[id]` | ✗* | ✅ | ✅ |
| `/chat` (Tab Chat) | ✗* | ✅ | ✅ |
| `/chat` (Tab Sources) | ✗ | ✗ | ✅ |
| `/upload` | ✗ | ✗ | ✅ |

*AuthGuard redirect về `/login` nếu chưa đăng nhập.

---

## 9. Styling

- **Tailwind CSS** + CSS variables (light mode, dark mode ready)
- **shadcn/ui** components: Card, Dialog, Tabs, Select, ScrollArea, Badge, Skeleton, ...
- **Status colors**: PENDING=yellow, PROCESSING=blue, COMPLETED=green, FAILED=red
- **Role badge colors**: SUPER_ADMIN=destructive, TEACHER=secondary, STUDENT=outline

---

## 10. Key Decisions

| Decision | Choice | Lý do |
|---|---|---|
| Auth storage | Zustand persist → localStorage | Token available ở interceptor và WS hook |
| WS token | `?token=` query param | Next.js rewrites không forward custom headers |
| Bulk upload | FormData `files[]` → `/upload/videos` | Backend tạo UploadBatch, track từng file |
| Card rendering | `__card_type` JSON field | Agent-agnostic, frontend tự detect và render |
| Tab Sources | Chỉ TEACHER+ | Student không cần quản lý nguồn tài nguyên |
| Video URL | Presigned MinIO URL (1h) | Không cần streaming endpoint riêng |
| SSR | Player dynamic import | react-player không tương thích SSR |

---

## 11. File Structure hoàn chỉnh

```
src/
├── app/
│   ├── layout.tsx, page.tsx
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── programs/[id]/page.tsx, page.tsx
│   ├── courses/[id]/page.tsx
│   ├── lectures/[id]/page.tsx
│   ├── upload/page.tsx
│   ├── search/page.tsx
│   └── chat/page.tsx
├── components/
│   ├── auth/AuthGuard.tsx
│   ├── layout/Sidebar.tsx, Header.tsx, UserMenu.tsx, Providers.tsx
│   ├── providers/BatchPollProvider.tsx
│   ├── chat/ChatInterface.tsx, StatCard.tsx, CitationCard.tsx
│   ├── lecture/LecturePlayer.tsx, SceneTimeline.tsx, ProcessingStatus.tsx
│   ├── search/SearchBar.tsx, SearchResultCard.tsx
│   ├── upload/UploadForm.tsx
│   └── ui/ (shadcn components + StatusBadge)
├── hooks/
│   ├── useWebSocket.ts
│   ├── useJobPolling.ts
│   └── useBatchPolling.ts
├── store/
│   ├── useAuthStore.ts
│   ├── useChatStore.ts
│   ├── usePlayerStore.ts
│   └── useUploadStore.ts
├── lib/
│   ├── api.ts
│   ├── queryKeys.ts
│   └── utils.ts
└── types/
    └── api.ts
```
