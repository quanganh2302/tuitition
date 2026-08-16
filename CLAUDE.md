# music-center — Context & Guide cho Claude

> **Web quản lý TRUNG TÂM DẠY NHẠC** (tiếng Việt). Đang được **dựng lại trên nền demo gốc
> Lucas Dev "full-stack-school"** (UI sạch, đầy đủ), rồi áp domain trung tâm nhạc theo thiết kế
> của mình. **File này là điểm vào context — đọc trước tiên.**

## ⚠️ TRẠNG THÁI: ĐANG REBUILD (đọc kỹ)

Project này = copy từ template demo (domain TRƯỜNG HỌC) + schema music-center. **Phần lớn code
demo hiện còn tham chiếu model trường học (Subject/Exam/Lesson-school/Grade/Result/Event) nên
CHƯA build được** — đó là bình thường, đang trong quá trình rewire sang domain music-center.
Tiến độ + việc cần làm: **[docs/ROADMAP.md](docs/ROADMAP.md)**.

## Nguồn context đầy đủ (đọc theo thứ tự)

1. **[docs/SPEC.md](docs/SPEC.md)** — chức năng nghiệp vụ đầy đủ + vai trò/phân quyền.
2. **[docs/DESIGN-roles-and-substitute.md](docs/DESIGN-roles-and-substitute.md)** — mô hình SỞ HỮU + DẠY THAY + các quyết định đã chốt (D1–D4).
3. **[docs/DESIGN-multi-tenant.md](docs/DESIGN-multi-tenant.md)** — chuyển sang PUBLIC app + MULTI-TENANT (Clerk Orgs, 3 tầng: super-admin/admin trung tâm/GV). _(chốt 2026-08-08, chưa code.)_
4. **[docs/ROADMAP.md](docs/ROADMAP.md)** — kế hoạch từng pha + đang ở đâu.
5. **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — pattern code (list page, actions, forms). _(mô tả pattern chung; cấu trúc thư mục ở đó là của project cũ, dùng làm tham chiếu pattern.)_

## Domain — tóm tắt (chi tiết ở SPEC/DESIGN)

- **Sở hữu**: mỗi HS/lớp thuộc 1 giáo viên (`Student.ownerTeacherId`, `Class.teacherId`). Teacher toàn quyền CRUD phần của mình; admin thấy & quản tất cả + tài khoản GV + tham số lương. **Solo** = tài khoản admin có kèm hồ sơ Teacher (vừa quản vừa dạy). Chạy được cho cả GV đơn lẻ lẫn trung tâm.
  > ⚠️ **Sắp đổi (Phase 5 — public/multi-tenant, đã thiết kế, chưa code):** app thành PUBLIC, nhiều trung tâm cùng DB. "admin" = admin **của một trung tâm** (lọc theo `orgId`, KHÔNG còn thấy tất cả); trên cùng là **super-admin** (chủ hệ thống, thấy mọi trung tâm). Chi tiết: [docs/DESIGN-multi-tenant.md](docs/DESIGN-multi-tenant.md).
- **Loại lớp** (`Class.type`): `CENTER` (lớp nhóm) / `PRIVATE` (gia sư 1-1).
- **Điểm danh cấp học viên** (`Attendance`: classSession+student+status) → nuôi **học phí** và **lương**.
- **Dạy thay** (`ClassSession.taughtById`): lương buổi trả cho **người thực dạy**, nhưng tính theo **đơn giá của CHỦ LỚP**; chỉ có ở chế độ trung tâm, **admin gán**; solo không có.
- **Học phí** (HS/tháng): số buổi HS có mặt × đơn giá/buổi → `MonthlyTuition`.
- **Lương** (GV/tháng): gia sư = Σ buổi × đơn giá; lớp TT = Σ mỗi buổi (mốc cố định + số HS có mặt × hệ số). Tham số lương theo TỪNG giáo viên (`privateRatePerSession`, `centerBasePerSession`, `centerRatePerStudent`).

## Tech stack

Next.js **14.2** App Router · **Prisma 6** + PostgreSQL (**Neon**) · **Clerk** (`publicMetadata.role`) ·
TailwindCSS (màu `lucas*`) · Recharts · react-big-calendar · react-hook-form + **zod** ·
Cloudinary (`next-cloudinary`, preset `diemDanh`) · react-toastify · **next-intl** (i18n). Path alias `@/*`→`src/*`.

**i18n (next-intl, cookie-based — không đổi URL):** locale ở cookie `locale` (nút `LanguageSwitcher`), đọc ở
`src/i18n/request.ts`; chuỗi dịch trong `messages/vi.json` + `messages/en.json` (theo namespace). Server component
dùng `getTranslations("NS")`, client dùng `useTranslations("NS")`. **Đã dịch toàn bộ UI** (list/form/dashboard/
detail/auth/platform + component chung). Thêm chữ mới = thêm key vào **CẢ 2 file** rồi dùng `t("key")` — đừng để
chuỗi cứng. Namespaces: Menu/Navbar/Common/Days/Teachers/Students/Classes/Lessons/Tuition/Parents/Salary/
TeacherDetail/StudentDetail/Forms/Dashboard/Auth/Platform/Suspended/Notifications/Language.

## Hạ tầng ĐÃ CÓ (dùng lại, đừng dựng mới)

- **Neon DB**: schema music-center đã migrate — 29 migrations, `prisma migrate status` = up-to-date.
  Trong `.env`: `DATABASE_URL` (pooled) + `DIRECT_URL` (direct, cho migrate) + `sslmode=require`.
  Data hiện chỉ vài record test (xoá/seed lại được thoải mái).
- **Clerk**: instance `musical-mako-27`. **Đã cấu hình session token** claim `{"metadata":"{{user.public_metadata}}"}`
  (bắt buộc, không có thì middleware không thấy role). Có user `admin` (username `admin`) + vài test teacher.
  **Organizations đã BẬT (2026-08-08)**; code đã cách ly tenant qua `orgId` (Phase B — golden rule #11).
  **Đừng bật "require organization"** (super-admin cần org-less).
  **Xác minh email khi ĐĂNG KÝ (Phase H, 2026-08-10):** bật **Sign-up with email** + **Verify at sign-up**
  (email code), **Require email address = OFF** — chỉ áp cho người **tự đăng ký** (admin trung tâm/solo).
  **GV do admin tạo TRỰC TIẾP** (username + mật khẩu, email chỉ là field liên hệ — KHÔNG xác minh; đã cân
  nhắc luồng mời qua email rồi bỏ cho đơn giản). Hạn mức GV/org = `publicMetadata.teacherLimit` (mặc định 3);
  solo không được thêm GV. Xem [docs/DESIGN-multi-tenant.md](docs/DESIGN-multi-tenant.md).
- **Cloudinary**: preset `diemDanh` (upload avatar).

## Trang GIỮ LẠI (route group `(dashboard)`)

teachers · students · parents · classes · lessons(→buổi học/điểm danh) · announcements(→học phí) · dashboard(admin/teacher/student/parent).
**Đã BỎ** trang trường học: subjects/exams/results/events/assignments (+ SubjectForm/ExamForm).
**Giữ widget THỜI TIẾT** ở admin dashboard (port từ project cũ).

## Schema music-center — điểm khác demo trường học

- `Teacher`: id=Clerk userId, +subject(nhạc cụ), +3 tham số lương. `ownedStudents`, `taughtSessions`.
- `Class`: +`type`(ClassType), +`teacherId`(chủ lớp). `date`=thứ trong tuần.
- `Student`: +`ownerTeacherId`(GV phụ trách). M-N với Class.
- `ClassSession`: 1 buổi cụ thể; `status`(ClassStatus UPCOMING/TAUGHT/CANCELED), `+taughtById`, `attendances`.
- `Attendance`: điểm danh cấp HV (unique classSessionId+studentId, status PRESENT/ABSENT/EXCUSED).
- `MonthlyTuition`: học phí/HS/tháng. (schema thật: `prisma/schema.prisma`)

## ⚠️ GOLDEN RULES

1. **`auth()` chỉ gọi TRONG thân component/hàm** — không ở top-level module (làm `next build` fail). `columns` phụ thuộc `role` cũng khai báo trong component.
2. **Ranh giới server/client**: page + `FormContainer` + `actions.ts` = server; `*Form.tsx` + component tương tác = `"use client"`. Không import server component vào client.
3. **Mọi mutation qua `src/lib/actions.ts`** (`"use server"`), trả `{ success, error, message? }`. create/update: `(currentState, data)`; delete: `(currentState, formData)` đọc `id`.
4. **Lỗi trả `message` qua helper `getErrorMessage()`** (dịch lỗi Clerk/Prisma sang tiếng Việt) — form hiện `state.message`, đừng để "lỗi mù".
5. **DB chỉ qua `@/lib/prisma`** singleton.
6. **Trang danh sách**: đọc `searchParams`(page/search) → `Prisma.<Model>WhereInput` → `$transaction([findMany,count])` với `ITEM_PER_PAGE`.
7. **Data scoping theo sở hữu**: role=teacher chỉ thấy đồ của mình (students: `ownerTeacherId=userId`; classes/lessons: `teacherId=userId`; announcements: `student.ownerTeacherId`). role=admin: không lọc. Nút CRUD hiện cho cả teacher (cờ `canManage = admin||teacher`). create tự gán chủ sở hữu theo actor (teacher→mình, admin→chọn). _(Phase 5: thêm tầng `orgId` — admin cũng lọc theo org của mình; chỉ super-admin không lọc. Xem [docs/DESIGN-multi-tenant.md](docs/DESIGN-multi-tenant.md).)_
8. **Ngày buổi học chuẩn hoá `toVietnamMidnightUTC`**; giờ lưu dạng UTC (đọc bằng `getUTC*`, hiển thị kèm `timeZone:"UTC"`).
9. **Thêm route → thêm `routeAccessMap`** (`lib/settings.ts`). Thêm resource CRUD → theo skill `.claude/skills/add-crud-resource`.
10. **Dùng lại primitives** `Table/Pagination/TableSearch/InputField/FormModal` + màu `lucas*`. Không tự dựng lại.
11. **Tenant scoping (multi-tenant, Phase B ✅)**: MỌI query đọc + mọi mutation ghi trên model có `orgId` (Teacher/Student/Class/Parent/ClassSession/MonthlyTuition) PHẢI đi qua `getScope()` + `orgWhere()` (`lib/scope.ts`). List/read: merge `orgWhere(scope)` vào `where`. Create: gán `orgId: scope.orgId`. Update/delete: guard `findFirst({ where: { id, ...orgWhere(scope) } })` trước. **Bypass duy nhất = super-admin** (`orgWhere` trả `{}`); người không có org → sentinel `__no_org__` (FAIL-CLOSED). Thiếu 1 chỗ = rò dữ liệu chéo trung tâm. Child rows (`Attendance`) scope qua `classSession`.

## Bẫy đặt tên

`lesson`/list lessons/key "lesson" = **ClassSession** (buổi học). `announcement`/key "announcement" = **MonthlyTuition** (học phí).

## Style code

Viết **gọn, tối giản** (tinh thần "ponytail lite"): YAGNI, tái dùng trước, không thêm abstraction/file thừa. Giữ UI/JSX của demo, chỉ thay tầng dữ liệu.

## Nguồn logic để PORT (project cũ đã chạy)

`D:\1_Work\1_Personal\3_FE\DASHBOARD_UI` có code music-center chạy được (UI rối, nên ta làm lại UI từ demo). Port sang: CRUD giáo viên (Clerk user + role=teacher + rollback), scoping theo sở hữu, `generateSessionsForClass` (tự sinh buổi khi tạo lớp), `markAttendance` + `GET /api/classSessions/attendance` + form điểm danh (`LessonForm`), `getErrorMessage`, các zod schema.

## Verify sau khi sửa

`npx tsc --noEmit` (0 lỗi) → `npx next build` (pass tới "Generating static pages"). Đổi schema thì `npx prisma migrate dev` + `generate` trước.
