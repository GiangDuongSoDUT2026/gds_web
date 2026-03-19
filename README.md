# Giảng Đường Số — Frontend (gds_web)

Next.js 14 frontend cho hệ thống AI bài giảng. Giao diện chatbase với phân quyền theo role, video player, tìm kiếm ngữ nghĩa, upload hàng loạt và thông báo xử lý nền.

---

## Tech Stack

| Thư viện | Phiên bản | Vai trò |
|---|---|---|
| Next.js | 14.2 | Framework (App Router) |
| TypeScript | strict | Type safety |
| shadcn/ui + Radix UI | latest | Component library |
| TanStack Query | v5 | Server state, caching |
| Zustand | v4 | Client state (persist) |
| react-player | v2 | Video playback (SSR-safe dynamic import) |
| react-dropzone | v14 | Drag-and-drop upload (multi-file) |
| react-hook-form + zod | latest | Form validation |
| axios | v1 | HTTP client với interceptors |
| sonner | v1 | Toast notifications |

---

## Cấu trúc thư mục

```
gds_web/src/
├── app/
│   ├── layout.tsx              # Root: AuthGuard, Providers, Sidebar, Header
│   ├── page.tsx                # Dashboard
│   ├── login/page.tsx          # Đăng nhập
│   ├── register/page.tsx       # Đăng ký (STUDENT / TEACHER)
│   ├── programs/
│   │   ├── page.tsx            # Danh sách programs
│   │   └── [id]/page.tsx       # Program detail + courses
│   ├── courses/[id]/page.tsx   # Course detail + chapters + lectures
│   ├── lectures/[id]/page.tsx  # Video player + scene timeline
│   ├── upload/page.tsx         # Upload 1 hoặc nhiều video (TEACHER+)
│   ├── search/page.tsx         # Keyword / semantic search
│   └── chat/page.tsx           # Chatbase UI (2 tabs)
├── components/
│   ├── auth/
│   │   └── AuthGuard.tsx       # Redirect /login nếu chưa xác thực
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── UserMenu.tsx        # Dropdown: tên, role badge, đăng xuất
│   │   └── Providers.tsx       # QueryClient + BatchPollProvider
│   ├── providers/
│   │   └── BatchPollProvider.tsx  # Poll bulk upload mỗi 5s (global)
│   ├── chat/
│   │   ├── ChatInterface.tsx
│   │   ├── StatCard.tsx        # Render StatsCard + TableCard từ agent
│   │   └── CitationCard.tsx
│   ├── lecture/
│   │   ├── LecturePlayer.tsx   # react-player (SSR-safe)
│   │   ├── SceneTimeline.tsx
│   │   └── ProcessingStatus.tsx
│   ├── search/
│   │   ├── SearchBar.tsx
│   │   └── SearchResultCard.tsx
│   ├── recommendations/
│   │   └── RecommendationCard.tsx  # Keyframe + reason badge + progress bar
│   └── upload/
│       └── UploadForm.tsx      # Multi-file dropzone + progress
├── hooks/
│   ├── useWebSocket.ts         # WS với auto-reconnect + card events
│   ├── useJobPolling.ts        # Poll Celery task status
│   └── useBatchPolling.ts      # Poll UploadBatch → toast khi xong
├── store/
│   ├── useAuthStore.ts         # JWT + user (Zustand persist)
│   ├── useChatStore.ts         # Messages + streaming + cards
│   ├── usePlayerStore.ts       # Seek target + timestamp
│   └── useUploadStore.ts       # Active batches tracking
├── lib/
│   ├── api.ts                  # Axios + all API functions
│   ├── queryKeys.ts            # TanStack Query key factory
│   └── utils.ts                # formatTimestamp, formatDuration, cn()
└── types/
    └── api.ts                  # All TypeScript types
```

---

## Auth & Phân quyền

### Stores
**`useAuthStore`** (Zustand persist → localStorage `gds-auth`):
```typescript
{ user, accessToken, refreshToken }
isAuthenticated()
hasRole(...roles)
isTeacherOrAbove()    // TEACHER | FACULTY_ADMIN | SCHOOL_ADMIN | SUPER_ADMIN
isFacultyAdminOrAbove()
isSchoolAdminOrAbove()
isSuperAdmin()
```

### Flow
1. `/login` → `POST /api/v1/auth/login` → `{access_token, refresh_token}`
2. `GET /api/v1/auth/me` → `User` → `setAuth(user, tokens)`
3. Axios interceptor tự đọc `localStorage["gds-auth"]` → `Authorization: Bearer <token>`
4. WebSocket → `ws://localhost:80/chat/ws/chat/{id}?token=<token>`
5. `AuthGuard` — redirect `/login` nếu chưa đăng nhập

### UI theo role
| Feature | STUDENT | TEACHER | FACULTY_ADMIN+ |
|---|---|---|---|
| Xem lectures | ✅ | ✅ | ✅ |
| Tab "Sources" trong Chat | ✗ | ✅ | ✅ |
| Upload lecture | ✗ | ✅ | ✅ |
| Tạo/sửa/xóa chapter | ✗ | ✅ | ✅ |
| Tạo/sửa/xóa course | ✗ | ✗ | ✅ |
| Tạo/sửa/xóa program | ✗ | ✗ | SCHOOL_ADMIN+ |

---

## Chat — Chatbase UI

```
┌─ [Chat] [Sources*] ─────────────────────────────────┐
│                                    │  Citations      │
│   Messages:                        │  sidebar        │
│   ┌─────────────────────┐          │  (tự hiện       │
│   │ User message        │          │   khi có)       │
│   └─────────────────────┘          │                 │
│   ┌──────────────────────────────┐ │                 │
│   │ AI: text response            │ │  [Citation 1]   │
│   │ ┌──────────────────────────┐ │ │  Lecture title  │
│   │ │ StatCard: metric grid    │ │ │  00:12 – 01:45  │
│   │ └──────────────────────────┘ │ │  [keyframe img] │
│   └──────────────────────────────┘ │                 │
│                                    │                 │
├────────────────────────────────────┘                 │
│  [Input field...]                      [Send]        │
└──────────────────────────────────────────────────────┘
```

**Tab Chat**: tất cả roles — text + StatCard + TableCard + citations
**Tab Sources** *(TEACHER+ only)*: bảng toàn bộ lectures, filter status, link xem, nút Upload

### StatCard (từ agent `get_statistics`)
```
┌─ Thống kê hệ thống ──────────────────┐
│ 📹 150 bài giảng  ✅ 120 hoàn thành  │
│ ⏳ 20 đang xử lý  ❌ 10 thất bại     │
│ 📚 25 môn học     ⏱ 300.5 giờ       │
└──────────────────────────────────────┘
```

### WebSocket events
```
{type: "token", content}       → append to message
{type: "tool_call", tool}      → show tool badge
{type: "card", data}           → render StatCard/TableCard
{type: "citations", citations} → show sidebar
{type: "done"}                 → stop streaming
{type: "error", message}       → toast error
```

---

## Bulk Upload

1. Dropzone chấp nhận **nhiều file cùng lúc** (tối đa 20)
2. Gọi `POST /api/v1/upload/videos` → nhận `{batch_id}`
3. `useUploadStore` lưu batch vào state
4. `BatchPollProvider` (global) poll `GET /upload/batches/{batch_id}` mỗi 5 giây
5. Khi `is_done = true`:
   - Tất cả thành công: `toast.success("5/5 video xử lý thành công")`
   - Có thất bại: `toast.warning("3 thành công, 2 thất bại")`

---

## Learning Analytics

### Tính năng tracking
- `LecturePlayer` gọi `updateProgress()` mỗi 30 giây (position, watched_seconds)
- Khi video kết thúc: `markComplete()` + `logLearningEvent("complete")`
- Deep-link resume: `/lectures/{id}?t=<seconds>` → player bắt đầu từ vị trí đó

### Dashboard (`/`)
```
┌─ Tiếp tục học ──────────────────────────────────────┐
│  [Keyframe] Video đang xem          ████░░ 65%       │
│  Chapter 3 · 1:23:45                [Tiếp tục]       │
└──────────────────────────────────────────────────────┘

┌─ Đề xuất cho bạn ───────────────────────────────────┐
│  [Keyframe] Bài giảng đề xuất       [related]        │
│  [Keyframe] Bài giảng tiếp theo     [next]           │
│  [Keyframe] Bài mới nhất            [new]            │
└──────────────────────────────────────────────────────┘
```

### RecommendationCard
- Keyframe thumbnail + reason badge (`continue` / `next` / `related` / `new`)
- Progress bar cho in-progress videos
- Deep-link `?t=<position_sec>` để resume

### Chat — Learning queries
```
Student: "Tôi đã học được bao nhiêu giờ?"
→ learning_progress(action="stats") → StatCard

Student: "Tiếp tục xem gì?"
→ learning_progress(action="continue") → TableCard + links

Student: "Đề xuất bài học tiếp theo?"
→ learning_progress(action="recommendations") → TableCard
```

---

## Next.js Rewrites (next.config.mjs)

```
/api/v1/* → http://localhost:8000/api/v1/*
/chat/*   → http://localhost:8001/*
```

WebSocket kết nối trực tiếp qua Nginx: `ws://localhost:80/chat/ws/chat/{id}?token=<jwt>`

---

## Hướng dẫn Chạy Local

### Yêu cầu

| Tool | Phiên bản |
|---|---|
| Node.js | ≥ 18 |
| pnpm | ≥ 9 |
| Backend (gds_ai_api) | Đang chạy tại port 8000 + 8001 |

### Bước 1: Cài dependencies

```bash
cd gds_web
pnpm install
```

### Bước 2: Tạo file .env.local

```bash
# Để trống — dùng Next.js rewrites để proxy sang backend
# Chỉ cần nếu backend chạy trên host khác
cat > .env.local << 'EOF'
# Để trống = dùng rewrites (localhost:3000 → localhost:8000/8001)
NEXT_PUBLIC_API_BASE_URL=
EOF
```

### Bước 3: Khởi động backend trước

Backend cần chạy trước để frontend có data. Xem hướng dẫn deploy tại `gds_ai_api/README.md`.

**Cách nhanh nhất:**
```bash
cd ../gds_ai_api
cp .env.example .env
# Sửa .env: điền OPENAI_API_KEY
docker compose up -d postgres rabbitmq minio minio-init falkordb db-migrate
uv run --package api uvicorn api.main:app --port 8000 --reload &
uv run --package chatbot uvicorn chatbot.main:app --port 8001 --reload &
```

### Bước 4: Chạy frontend

```bash
cd gds_web
pnpm dev
```

Mở http://localhost:3000

### Bước 5: Tạo tài khoản đầu tiên

Frontend cần có tài khoản để login. Tạo nhanh bằng curl:

```bash
# Tạo SUPER_ADMIN
curl -X POST http://localhost:8000/api/v1/auth/admin/users \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gds.edu.vn","password":"Admin@123","full_name":"Admin","role":"SUPER_ADMIN"}'

# Tạo STUDENT
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"sv@gds.edu.vn","password":"Test@123","full_name":"Nguyễn Văn A","role":"STUDENT","student_code":"SV001","major":"CNTT"}'

# Tạo TEACHER
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"gv@gds.edu.vn","password":"Test@123","full_name":"Trần Thị B","role":"TEACHER","teacher_code":"GV001","department":"Khoa học máy tính"}'
```

---

## Build production

```bash
# Type check
pnpm type-check

# Build
pnpm build

# Chạy production server
pnpm start
```

---

## Env vars

```env
# .env.local

# Nếu backend không chạy cùng host, set URL đây
NEXT_PUBLIC_API_BASE_URL=http://your-server:8000

# WebSocket URL (nếu khác localhost)
NEXT_PUBLIC_WS_URL=ws://your-server:80
```

Nếu để trống, Next.js rewrites tự proxy:
- `/api/v1/*` → `http://localhost:8000/api/v1/*`
- `/chat/*` → `http://localhost:8001/*`
- WebSocket → `ws://localhost:80/chat/ws/chat/{id}?token=<jwt>` (qua Nginx)

---

## Troubleshooting

**Trang trắng khi load:**
- Zustand cần hydrate từ localStorage trước khi check auth — AuthGuard hiển thị spinner trong lúc chờ, không còn blank page nữa.

**Login xong redirect về /login lại:**
- Kiểm tra backend API đang chạy tại `localhost:8000`
- Mở DevTools → Network → kiểm tra `/api/v1/auth/login` trả về token đúng không

**Video không play:**
- `video_url` là presigned MinIO URL — kiểm tra `MINIO_PUBLIC_URL` trong backend `.env` trỏ đến địa chỉ truy cập được từ browser
- Local dev: `MINIO_PUBLIC_URL=http://localhost:9000`

**WebSocket chat không kết nối:**
- Cần Nginx đang chạy (port 80) để proxy WebSocket
- Hoặc sửa `useWebSocket.ts` trỏ thẳng đến `ws://localhost:8001/ws/chat/{id}?token=<jwt>` khi dev

**Upload bị lỗi CORS:**
- Đảm bảo backend CORS đã cho phép `http://localhost:3000`
- API config mặc định `allow_origins=["*"]` nên không bị CORS trong dev
