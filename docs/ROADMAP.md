# ROADMAP — Dựng lại trên nền demo sạch

> Project `music-center` = copy từ template gốc Lucas Dev "full-stack-school" (UI sạch, đầy đủ),
> rồi áp domain TRUNG TÂM NHẠC theo [SPEC.md](SPEC.md) + [DESIGN-roles-and-substitute.md](DESIGN-roles-and-substitute.md).
> Nguồn logic tham chiếu: project cũ `D:\1_Work\1_Personal\3_FE\DASHBOARD_UI` (đã có code music-center chạy được, nhưng UI rối).

## Nguyên tắc

- **Giữ UI/component/style của demo** (Table, Menu, FormModal, chart, layout, form đẹp).
- **Thay lõi domain**: schema music-center (Teacher+lương, Class+type+teacherId, Student+ownerTeacherId, ClassSession+taughtById, Attendance, MonthlyTuition).
- Dùng lại **Neon DB** (schema đã khớp) + **Clerk** `musical-mako-27` (đã chạy).
- Giữ **widget thời tiết** ở admin dashboard (port từ DASHBOARD_UI).
- Bỏ trang trường học (subjects/exams/results/events/assignments) — ĐÃ XONG Phase 0.

## Các pha

### Phase 0 — Nền móng ✅

Copy demo → `music-center`; mang `.env` (Neon+Clerk), `prisma` (schema+migrations khớp Neon), `docs`, `.claude`; nâng Prisma 6.11; `npm install`; bỏ trang trường học.

### Phase 1 — Cho build được trên schema music-center

Các trang giữ lại (teachers, students, parents, classes, lessons, announcements) + FormModal/FormContainer/Menu của demo đang tham chiếu model TRƯỜNG HỌC (subject/exam/lesson-school/grade/result/event) → **rewire data layer sang model music-center**, giữ nguyên JSX/style demo. Port logic từ DASHBOARD_UI: CRUD giáo viên, sở hữu (ownerTeacherId/teacherId scoping), tự sinh buổi, thông báo lỗi tiếng Việt.

### Phase 2 — Dashboard + thời tiết

Adapt UserCard/CountChart/AttendanceChart/FinanceChart sang số liệu music-center; **thêm widget thời tiết** (port từ DASHBOARD_UI) vào admin.

### Phase 3 — Điểm danh → Học phí → Lương

Màn điểm danh cấp HV (đã làm ở DASHBOARD_UI, port sang); tính học phí (số buổi present × đơn giá) → MonthlyTuition; engine lương (Σ buổi TAUGHT theo taughtById, tham số CHỦ LỚP theo Class.type); dạy thay (admin gán taughtById).

### Phase 4 — Hoàn thiện

Phân quyền theo sở hữu toàn bộ trang, dọn rác, verify build + chạy thử.

### Phase 5 — Public app + Multi-tenant 🆕 (thiết kế xong, chưa code)

Chuyển private → public: đăng ký công khai (Trung tâm/Solo), multi-tenant qua **Clerk
Organizations**, 3 tầng (super-admin / admin trung tâm / GV), trang `/platform` cho super-admin.
Chi tiết + các pha A–G: **[DESIGN-multi-tenant.md](DESIGN-multi-tenant.md)**.

- **Phase A (schema) ✅:** migration `add_org_id_tenant` — thêm `orgId String?` + index vào Teacher,
  Student, Class, Parent, ClassSession, MonthlyTuition (nullable, migrate an toàn). Áp Neon OK, `tsc` 0 lỗi.
  _(Data test cũ để `orgId=NULL`; backfill/reseed khi Phase C tạo org thật — chưa có org nào.)_
  _(Lưu ý Windows: `prisma generate` có thể báo EPERM khoá DLL do node process đang chạy; `.d.ts` vẫn
  cập nhật đúng. Chạy lại `npx prisma generate` khi rảnh process để đồng bộ query engine.)_
- **Phase B (scoping) ✅:** helper `lib/scope.ts` (`getScope`/`orgWhere`, fail-closed sentinel `__no_org__`,
  super-admin bypass). Áp `orgId` vào: 7 list page + 2 detail page + FormContainer (dropdown) + attendance API
  - 8 dashboard container + finance engine (`generateMonthlyTuition`/`computeTeacherSalary` nhận `orgId`) +
    MỌI mutation trong `actions.ts` (create gán orgId; update/delete guard org+sở hữu; **vá lỗ `deleteClassSession`
    trước đây không guard**). Golden rule #11. `tsc` 0 lỗi + `next build` 16/16 trang.
    _(id-scoped nên bỏ qua: BigCalendarContainer, StudentAttendanceCard. Middleware routing để Phase F.)_
    ⚠️ **Trạng thái chuyển tiếp:** tài khoản test hiện KHÔNG có org → `orgWhere` trả sentinel → **thấy rỗng**.
    Để test: hoặc flag tài khoản thành `superadmin` (thấy tất cả), hoặc dùng Phase C để đăng ký org thật.
- **Phase C (đăng ký công khai) ✅:** trang [`/sign-up`](../src/app/sign-up/page.tsx) chọn Trung tâm/Solo →
  `useSignUp` tạo user (username+mật khẩu) → server action `provisionAccount` (actions.ts) tạo Clerk Org
  (user=org:admin), set `role=admin`, và **solo** tạo hồ sơ Teacher (id=userId, orgId) — idempotent.
  **Tenant lấy từ `publicMetadata.orgId` (KHÔNG dùng "active organization"):** cách active-org (client `setActive`
  - `EnsureActiveOrg`) quá mong manh — điều hướng không re-run, race timing → `auth().orgId` null → mọi query
    org-scoped trống + trang chi tiết 404. **Đổi:** `getScope` đọc `orgId` từ `sessionClaims.metadata.orgId`
    (đồng bộ, luôn có trong token). Gán lúc tạo tài khoản: `provisionAccount` + `createTeacher` set
    `publicMetadata.orgId`. Đã **backfill** 3 tài khoản cũ (solo + 2 center admin). Xoá `EnsureActiveOrg`.
    Nhận diện solo: [`lib/solo.ts`](../src/lib/solo.ts) (`isSoloAdmin`, dùng orgId từ bản ghi Teacher).
    ⚠️ Token cũ chưa có `orgId` → **phải đăng xuất/đăng nhập lại** để nạp token mới.
    `tsc` 0 lỗi + `next build` 17/17 trang.
    ⚠️ **Cần cấu hình Clerk:** bật **Sign-up**, cho phép **username + password**, **email không bắt buộc**
    (không thì `signUp.create` không "complete" — form báo lỗi hướng dẫn). KHÔNG bật "require organization".
    Mời GV vào org (org:member) = **Phase D**.
- **Phase D (mời GV vào org) ✅:** `createTeacher` thêm GV vào Clerk Organization của admin
  (`createOrganizationMembership` role `org:member`) → GV đăng nhập vào đúng trung tâm (EnsureActiveOrg
  kích hoạt org). Vá luôn rollback (trước match chuỗi "Prisma" → dễ để user Clerk rác; giờ xoá user vừa tạo
  trên MỌI lỗi sau createUser). `tsc` 0 lỗi. _(Clerk free giới hạn số member/org — kiểm khi lên production.)_
- **Phase E (panel super-admin) ✅:** trang [`/platform`](../src/app/platform/page.tsx) (NGOÀI route group
  `(dashboard)`, layout riêng) — liệt kê mọi org từ Clerk `getOrganizationList` + số liệu DB mỗi org
  (số GV/HS/doanh thu, tally trong JS). Chỉ mức tài khoản, không lội chi tiết (A).
  **Khoá/mở khoá org ✅** (chốt: KHÔNG xoá, chỉ khoá): `setOrgSuspended` set cờ `suspended` trên org
  publicMetadata; enforce ở `(dashboard)/layout` (org bị khoá → chặn UI, data giữ nguyên). Toggle ở `/platform`.
  _(ponytail — ceiling: chặn ở layout server nên bao trang khi tải; user đang ở trong, soft-nav vẫn thao tác
  được tới lần reload đầy đủ kế tiếp. Muốn chặn cả ghi tức thì → middleware + org-metadata session claim, để sau.)_
- **Phase F (middleware) ✅:** thêm `/platform(.*)→superadmin` vào `routeAccessMap`; super-admin sai route →
  về `/platform` (sign-in page cũng route super-admin về đây); **vá bug**: chưa đăng nhập/không role → về `/`
  (trước đá về `/undefined`). Verify browser: `/admin` & `/platform` (chưa login) → `/` sign-in, không lỗi.
  `tsc` 0 lỗi + `next build` 18/18 trang.
- **Phase G (security review) — audit tĩnh ✅, chờ test đăng nhập:**
  - Rà **~80 điểm query/mutation** (`prisma.*`): tất cả đi qua `orgWhere`/guard, hoặc id-scoped an toàn
    (BigCalendarContainer/StudentAttendanceCard — id đã org-check ở page cha), hoặc super-only (`/platform`).
  - **DB verify (read-only):** provisioning ghi `orgId` đúng — solo `quanganhdeptrai` có org. 2 center mới chưa có data.
    Data cũ (8 HS/5 lớp/32 buổi/10 học phí/3 GV) `orgId=null` → vô hình với tenant (fail-closed), chỉ super thấy.
  - **Test tự động tầng DB:** seed 2 org + 1 null → admin A chỉ thấy A, admin B chỉ thấy B, không-org thấy 0
    (fail-closed), super thấy cả 3, không lẫn chéo → PASS.
  - **Latent (không phải leak sống):** `ensureDueSessions` tin `where` của caller (mọi caller hiện scope đủ);
    `generateMonthlyTuition` cần truyền `orgId` (caller `closeMonthlyTuition` truyền đủ).
  - ⏳ **Còn:** test qua UI khi đăng nhập (auth().orgId chỉ verify được lúc login) — checklist ở dưới.
  - 🧹 Nên dọn data cũ `orgId=null` (reseed/gán org) để đỡ rác.
- **Phase H (xác minh email + mời GV bằng email + hạn mức) ✅ (2026-08-10):** `tsc` 0 lỗi + `next build` 19/19.
  - **#1 Xác minh email khi đăng ký:** `/sign-up` thêm ô email + màn nhập **mã 6 số**
    (`prepareEmailAddressVerification`/`attemptEmailAddressVerification`) trước `provisionAccount`.
    _(Phát hiện: form cũ chỉ gửi username+password → toggle "Verify at sign-up" của Clerk vô hiệu.)_
  - **#2 Cấp GV — CHỐT tạo trực tiếp (KHÔNG email):** đã code thử luồng mời qua Organization Invitation
    (GV tự đặt mật khẩu, provision ở `/onboarding`) rồi **revert** cho đơn giản. `createTeacher` = admin đặt
    username+mật khẩu + org membership + Teacher row (email chỉ là field liên hệ). `updateTeacher` sửa cả
    Clerk username/password. _(Đã xoá `/onboarding` + `provisionTeacher`.)_
  - **#3 Hạn mức GV (freemium):** `teacherLimit` (mặc định 3) trên org; `createTeacher` đếm Teacher, vượt →
    popup xin nâng (`requestTeacherLimit`); super-admin duyệt ở `/platform` (`setOrgTeacherLimit`).
  - **Solo chặn tạo GV:** guard `orgType==="solo"` trong `createTeacher`.
  - ✅ **#1 đã test sống** (đăng ký + đăng nhập bằng email OK). #2/#3 verify qua build + cần smoke-test UI.

## Trạng thái

- Phase 0: ✅ xong.
- Phase 1: ✅ build được (`tsc` 0 lỗi, `next build` pass, 14/14 trang). Đã port data layer từ DASHBOARD_UI: actions/schemas/forms/list pages/FormContainer/FormModal, scoping theo sở hữu, `generateSessionsForClass`, `getErrorMessage`. Widget dashboard (calendar/attendance/announcements) mới rewire tối thiểu cho compile — số liệu thật để Phase 2/3.
- Smoke-test tầng dữ liệu (Neon, không cần auth): 11/11 pass — tự sinh buổi (đúng thứ giờ VN, không nhân đôi), scoping sở hữu 2 chiều, quan hệ M-N. Đã sửa bug hiển thị ngày buổi (timeZone VN) + lệch cột date/tuition ở trang lessons.
- Phase 2: ✅ Dashboard admin số liệu thật: thẻ **Loại lớp** (CENTER/PRIVATE) · **Doanh thu tuần** (tách Trung tâm/Gia sư) · **Doanh thu/Lương theo tháng** (FinanceChart) · thẻ **Doanh thu** (năm + tháng, thay thẻ Parent) · UserCard badge có ý nghĩa (HS đang học / GV mới) · lịch hiện **số lớp/ngày** (badge góc).
  **Widget thời tiết ✅ (Phase 5 UX):** [`WeatherCard`](../src/components/WeatherCard.tsx) — Open-Meteo thật
  (free, không key, cache 30', mặc định Hà Nội qua env `WEATHER_LAT/LON`). Chỉ hiện ở **dashboard solo**.
  **Dashboard solo vs center:** `/admin` nhận diện solo = admin CÓ hồ sơ Teacher (D1) → hàng thẻ trên đổi
  thành **Thời tiết + "HS của tôi" + "Thu nhập tháng này"** (thay 4 thẻ tổng của center). Charts/lịch giữ nguyên (đã scope org).
- Phase 3: ✅ xong.
  - Điểm danh cấp HV: `markAttendance` + `LessonForm` + API `GET /api/classSessions/attendance` (chặn điểm danh buổi tương lai). Mở từ trang lessons **và** click buổi trên lịch (BigCalendarClient).
  - Mô hình buổi **B — vật chất hoá quá khứ, suy ra tương lai**: `ensureDueSessions` chỉ tạo buổi tới hạn (on-demand); tương lai vẽ **ảo** trên lịch (không lưu). HS nghỉ sớm chỉ cần `isStudying=false`. Smoke-test 8/8.
  - Vòng đời lớp `Class.endDate` + **chống trùng lịch dạy** (banner + checkbox trong ClassForm).
  - Engine `src/lib/finance.ts`: `generateMonthlyTuition` (giữ paidStatus, scope theo GV) + `computeTeacherSalary` (D3 dạy thay). Surfacing: nút **Chốt học phí** + toggle Đã/Chưa đóng (trang Học phí), trang **Lương** (`/list/salary`), ô gán **dạy thay** (chỉ trung tâm ≥2 GV). Smoke-test 9/9 + 5/5.
- Phase 4 (đang làm):
  - ✅ Dọn rác: xoá 3 file chết + 7 hàm/block chết trong actions.ts + import thừa. Parent **ẩn khỏi UI** (giữ model). Tài khoản GV cấp qua form (Clerk). Search **không dấu** (cột `searchName` + `normalizeVN`). Filter/Sort mọi list page. Menu dọn sạch (bỏ trang trường học).
  - ✅ Rà scoping/phân quyền: middleware cover sub-route (`/list/*(.*)`); `students/[id]` kiểm sở hữu; **mọi mutation** kiểm quyền (teacher chỉ sửa/xoá lớp+HS của mình; CRUD giáo viên/phụ huynh = admin-only).
  - ⏳ CÒN LẠI: kiểm thử E2E qua UI, Việt hoá nhãn, (tuỳ chọn) widget thời tiết + dashboard teacher/student.
- Verify: `tsc` 0 lỗi + `next build` pass (16/16 trang). Data demo trên Neon (2 GV có login, 5 HS, học phí T6 đã đóng / T7 vài HS chưa).
