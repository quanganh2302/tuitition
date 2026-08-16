# Kiến trúc & logic từng section

Tài liệu tham chiếu sâu. Tổng quan + quy tắc: [../CLAUDE.md](../CLAUDE.md).

---

## 1. Luồng dữ liệu tổng quát

```
Trình duyệt
  │  (URL ?page=&search=)
  ▼
Page (server component, list/<resource>/page.tsx)
  │  auth() → role     ← BÊN TRONG component
  │  prisma.$transaction([findMany(where, take, skip, include), count(where)])
  ▼
<Table columns renderRow data /> + <Pagination /> + <TableSearch />
  │  nút Create/Update/Delete → <FormContainer table type data id />
  ▼
FormContainer (server)  ── fetch relatedData (option cho dropdown) ──►  FormModal (client)
                                                                          │
                    ┌─────────────────────────────────────────────────────┤
                    ▼ create/update                                        ▼ delete
              <XxxForm> (client)                                    <form action={deleteXxx}>
              react-hook-form + zodResolver                          input hidden name="id"
              useFormState(create|update action)                     useFormState(deleteXxx)
                    │ onSubmit → formAction(data)
                    ▼
              actions.ts (server action, "use server")
              prisma.xxx.create/update  →  return { success, error }
                    │ state.success
                    ▼
              toast() + setOpen(false) + router.refresh()
```

**Nguyên tắc bất biến của luồng này:**
- Đọc dữ liệu: page server component gọi `prisma` trực tiếp (không qua API route).
- Ghi dữ liệu: luôn qua **server action** trong `lib/actions.ts`, không gọi `prisma` từ client.
- Sau khi ghi thành công: `router.refresh()` để server component fetch lại.
- API route (`app/api/**`) chỉ dùng cho thao tác **bulk** hoặc khi cần fetch từ client
  (vd `TuitionForm` gọi `/api/classSessions/date`).

---

## 2. Data model (prisma/schema.prisma)

```
Parent 1───* Student *───* Class 1───* ClassSession
                │              │
                │              └───* MonthlyTuition *───1 Student
                ├───* Assignment
                └───* MonthlyTuition
```

| Model | Vai trò | Ghi chú quan trọng |
|---|---|---|
| **Student** | Học sinh | `id` = **Clerk userId** (tạo user Clerk trước, rồi mới tạo record). M-N với Class. `tuition` là học phí/buổi. |
| **Parent** | Phụ huynh | 1 phụ huynh nhiều học sinh. |
| **Class** | Lớp học (lịch cố định hàng tuần) | `date` = **thứ trong tuần** (enum `Day`), KHÔNG phải ngày cụ thể. `startTime`/`endTime` lưu Date trên mốc giả `2025-01-01` (chỉ lấy giờ). M-N với Student. |
| **ClassSession** | **Một buổi học cụ thể** (1 ngày) | `status` = `ClassStatus` (UPCOMING/TAUGHT/CANCELED) = điểm danh. `@@unique([classId, date])`. Menu gọi là "Buổi học" / list `lessons`. |
| **MonthlyTuition** | Học phí theo tháng | Khoá `@@unique([studentId, classId, year, month])`. `totalAmount`, `paidStatus`. Menu gọi là "Thông báo" / list `announcements`. |
| **Assignment** | Bài tập của học sinh | Hiện chưa có UI (trang cũ đã xoá). |
| StudentClass | Bảng nối M-N tường minh | Prisma cũng tự quản quan hệ ngầm `StudentClasses`. |
| Admin / User / SheetMusic | Model rơi rớt từ template | Chưa dùng thực sự. |

Enum: `Day`, `UserSex(MALE/FEMALE)`, `LessonType(CENTER/HOME)`, `PaidStatus(PAID/UNPAID)`,
`ClassStatus(CANCELED/UPCOMING/TAUGHT)`, `Role(ADMIN/USER)`, `Difficulty`.

> **Zod schema phải mirror enum Prisma** — xem `lib/formValidationSchemas.ts`. Đổi enum ở
> schema.prisma thì phải cập nhật cả file này.

---

## 3. Logic riêng của từng section

Mỗi resource có nghiệp vụ khác nhau — đừng copy máy móc giữa chúng.

### Student (`list/students`)
- **Ràng buộc Clerk:** `createStudent` tạo user Clerk (username/password) → dùng `user.id` làm
  `student.id`. Nếu Prisma lỗi thì **rollback** xoá user Clerk. `deleteStudent` xoá cả Clerk lẫn DB.
- `updateStudent` chỉ đổi password khi field password khác rỗng.
- Quan hệ M-N: `create` dùng `connect`, `update` dùng `set`.
- Ảnh: upload Cloudinary (preset `diemDanh`) ở client, chỉ gửi `secure_url` xuống action.
- Trang chi tiết `list/students/[id]` có lịch (BigCalendar), shortcuts, Performance.

### Parent (`list/parents`)
- Đơn giản: tên, sex, phone, danh sách students (M-N connect/set). Không đụng Clerk.

### Class (`list/classes`)
- `startTime`/`endTime` nhập dạng `"HH:mm"` (zod regex), action convert thành
  `new Date("2025-01-01T${time}:00Z")` — chỉ giữ phần giờ.
- `date` là **thứ** (Day enum), không phải ngày.
- `relatedData` cho form = danh sách student để chọn thành viên lớp.

### ClassSession — list `lessons` (key `"lesson"`)
- Là **buổi học cụ thể**. `date` chuẩn hoá qua `toVietnamMidnightUTC`.
- Sinh buổi học tự động theo tháng bằng các hàm **bulk** trong actions.ts:
  - `bulkCreateClassSessionsForNewMonth()` — sinh buổi cho tháng kế, bỏ qua buổi đã tồn tại.
  - `bulkUpdateClassSessions()` — xoá buổi tương lai rồi sinh lại tới hết tháng sau.
  - `bulkUpdateClassSessionsByMonth(month)` — sinh/ghi đè buổi cho 1 tháng cụ thể (`"YYYY-MM"`).
  - Tất cả map `Day` → số thứ (0=CN..6=T7) rồi quét từng ngày trong khoảng.
- API wrap: `POST /api/classSessions/bulkCreate | bulkUpdate | updateByMonth`,
  `GET /api/classSessions/date?classId=` (các ngày đã có buổi).

### MonthlyTuition — list `announcements` (key `"announcement"`)
- Học phí theo tháng của học sinh. Hiển thị ở list + widget `Announcements` (3 khoản UNPAID mới nhất).
- ⚠️ `TuitionForm.tsx` hiện **tạm nối** vào `createClassSession`/`updateClassSession` —
  CHƯA ghi đúng vào `MonthlyTuition`. Muốn hoàn thiện: viết action `createTuition`/`updateTuition`
  theo `tuitionSchema` (studentId, classId, month, year, totalAmount, paidStatus).

### Dashboard theo role (`admin|teacher|student|parent/page.tsx`)
- `admin`: các chart (CountChart, AttendanceChart, FinanceChart) + EventCalendar + Announcements.
  Widget thời tiết hiện là **placeholder hardcode**.
- `student`: BigCalendar lịch cá nhân (query class có mình) + Announcements.
- `parent`: BigCalendar (hiện truyền `data={[]}`) + Announcements. **Là server component** (đừng thêm `"use client"`).

---

## 4. Auth & phân quyền

- Role lấy từ Clerk `sessionClaims.metadata.role` (server) hoặc `user.publicMetadata.role`.
- `middleware.ts` duyệt `routeAccessMap` (settings.ts): nếu role không nằm trong danh sách cho
  route đó → redirect về `/${role}`. **Thêm route bảo vệ mới thì thêm vào map này.**
- `Menu.tsx` ẩn/hiện mục theo `item.visible` (mảng role). Có nhiều mục đang comment (tính năng bỏ dở).

---

## 5. Ngày giờ & timezone

- Toàn bộ buổi học dùng **UTC nửa đêm giờ VN** qua `toVietnamMidnightUTC(date)` (utils.ts) để
  tránh lệch ngày. Khi so sánh/sinh ngày buổi học, luôn đi qua helper này.
- `adjustScheduleToCurrentWeek`, `getVietnamDateRangeThisWeek` hỗ trợ hiển thị lịch tuần.

---

## 6. Primitives tái sử dụng (đừng dựng lại)

| Component | Dùng khi |
|---|---|
| `Table` | Bảng danh sách: truyền `columns`, `renderRow`, `data`. |
| `Pagination` | Phân trang theo `ITEM_PER_PAGE` + query `?page=`. |
| `TableSearch` | Ô tìm kiếm → set `?search=` vào URL. |
| `InputField` | Input trong form (label + register + error). |
| `FormContainer` / `FormModal` | Bọc nút CRUD + modal + dispatch form. |
| Màu `lucasSky/Purple/Yellow(+Light)/DarkBlue/Green` | Xem `tailwind.config.ts`. |
