# Thiết kế: Public app + Multi-tenant (nhiều trung tâm)

> Ghi lại chốt ngày 2026-08-08. Bổ sung cho [SPEC.md](SPEC.md) và
> [DESIGN-roles-and-substitute.md](DESIGN-roles-and-substitute.md).
> **Chưa triển khai code** — đây là bản thiết kế để duyệt rồi mới làm.

## Bối cảnh: từ private → public

Trước đây app là **single-tenant**: đúng 1 admin, mọi Teacher/Student/Class... ngầm định
thuộc *một* trung tâm; không đăng ký được (admin cấp tài khoản GV tay).

Giờ chuyển thành **public app**: người lạ tự đăng ký, lúc đăng ký chọn **loại tài khoản**:
- **Trung tâm** → thành admin của trung tâm *riêng của họ*, tạo/mời nhiều GV.
- **Giáo viên solo** → vừa quản vừa dạy, một mình (đúng D1).

Hệ quả cốt lõi: DB chứa **nhiều trung tâm/solo độc lập cùng lúc** → phải **multi-tenant**,
mỗi trung tâm là một *tenant* và dữ liệu cách ly tuyệt đối với nhau.

---

## CHỐT: mô hình 3 tầng

| Tầng | Là ai | Nhận diện | Thấy gì |
|---|---|---|---|
| **Super-admin** (chủ hệ thống) | Chủ app (bạn) | `publicMetadata.role="superadmin"` + **không thuộc org nào** | **Mọi** trung tâm/solo; quản tài khoản + số liệu tổng |
| **Admin trung tâm** | Người đăng ký loại "trung tâm" | `org:admin` của org đó + `role="admin"` | Chỉ trung tâm của họ; tạo/mời GV |
| **Giáo viên** | GV được admin trung tâm mời | `org:member` + `role="teacher"` | Chỉ đồ của mình trong trung tâm đó |

**Solo** = `org:admin` của một **org 1 người** + `role="admin"` + **có hồ sơ `Teacher`**
(D1). Khác trung tâm ở đúng một điểm: solo tự tạo Teacher profile cho chủ tài khoản; trung
tâm thì không. Solo mời thêm GV thì tự nhiên "biến" thành trung tâm — không cần thao tác đổi loại.

---

## CHỐT: Tenant qua **Clerk Organizations**

- 1 trung tâm = 1 Clerk Organization; solo = Organization 1 người → **một cơ chế scoping theo
  `orgId` duy nhất** ở mọi nơi, không phân nhánh solo/trung tâm.
- Clerk lo sẵn: tạo org, mời thành viên, vai trò `org:admin`/`org:member`.
- Trong Clerk v5, `auth()` trả thẳng `{ userId, orgId, orgRole, sessionClaims }` — lấy `orgId`
  không cần thêm custom claim (claim `metadata` hiện có vẫn giữ để đọc `role`).

### Quyết định vai trò (M1)
Giữ `publicMetadata.role` làm **nguồn role** (`admin`/`teacher`/`superadmin`) như code hiện tại
để **ít churn nhất** — set lúc cấp tài khoản. Chỉ **thêm** `orgId` cho tầng tenant. Không đổi
chỗ đọc `role` đang rải khắp code.
- Một user = một org = một role (không hỗ trợ 1 người vừa teacher org A vừa solo — YAGNI).

---

## CHỐT: Super-admin

- **Không** qua đăng ký công khai. Bạn tự tạo user trong Clerk dashboard → Metadata → Public →
  đặt `{"role":"superadmin"}`. Không cần seed script.
- **Điều kiện:** tài khoản này **org-less** (không nằm org nào). Dấu hiệu "role=superadmin +
  không org" = chủ hệ thống → **bỏ qua filter `orgId`**, thấy tất cả.
- Quyền: **chỉ cấp tài khoản + số liệu tổng** (A). Không lội vào sửa dữ liệu vận hành của từng
  trung tâm (tránh rủi ro riêng tư — dữ liệu HS là thông tin cá nhân của khách hàng).
- ⚠️ Cờ này đặt tay trong Clerk, **không nằm trong git** — ghi lại ở đây để không quên.

### Trang `/platform` (panel super-admin)
- Route group riêng, chỉ `superadmin` vào (thêm vào `routeAccessMap`).
- Liệt kê mọi org: lấy từ `clerkClient.organizations.getOrganizationList()` + members, ghép số
  liệu DB `groupBy(orgId)` (mỗi org: số GV/HS/doanh thu).
- Hành động tối thiểu: xem, **tạm khoá / xoá** một org, reset admin trung tâm. Không CRUD dữ liệu bên trong.

---

## Thay đổi schema

Thêm cột **`orgId String`** (index) vào các bảng **được query trực tiếp ở cấp danh sách**:
`Teacher`, `Student`, `Class`, `Parent`, `ClassSession`, `MonthlyTuition`.

- Bảng con (`Attendance`) scope gián tiếp qua `ClassSession.orgId` — không cần cột riêng.
- **Denormalize `orgId` lên từng bảng thay vì lọc qua quan hệ lồng nhau** là chủ ý: an toàn
  hơn (defense-in-depth) và khó quên hơn khi viết query. *(ponytail: chấp nhận trùng 1 cột để
  giảm rủi ro rò tenant — đây là pattern chuẩn của multi-tenant, không phải over-engineer.)*
- Migration: data hiện tại là test (xoá/seed lại thoải mái) → gán hết vào 1 org mẫu **hoặc**
  seed lại từ đầu. Không cần backfill phức tạp.

---

## Scoping mới (phần bảo mật quan trọng nhất)

Gom vào **một helper** (vd `getScope()` trong `lib/`), trả `{ role, userId, orgId }` + điều kiện
`where` chuẩn:
- `superadmin` → **không** thêm `orgId` (thấy tất cả).
- admin trung tâm → `where.orgId = orgId`.
- teacher → `where.orgId = orgId` **và** điều kiện sở hữu hiện có (`ownerTeacherId`/`teacherId`).

Áp cho **mọi list page** và **mọi mutation** trong `actions.ts`. Tầng sở hữu (owner) hiện tại
giữ nguyên, chỉ chạy *bên trong* một org.

### GOLDEN RULE mới (bổ sung CLAUDE.md)
> **Mọi query & mutation phải đi qua `getScope()`** để tự thêm `orgId`. Thiếu một chỗ = admin
> trung tâm A đọc/sửa được dữ liệu trung tâm B. Một chỗ bypass duy nhất: `superadmin`.

---

## Luồng đăng ký

> ✅ **Đã code.** Bổ sung **xác minh email** (2026-08-10): form `/sign-up` thu thêm **email** →
> `signUp.create({ emailAddress, ... })` → `prepareEmailAddressVerification({ strategy: "email_code" })`
> → màn nhập **mã 6 số** → `attemptEmailAddressVerification` → mới `provisionAccount`. Solo lấy luôn
> email đã xác minh vào `Teacher.email`.

1. Bật **sign-up** trên Clerk (giờ chỉ có sign-in). Thêm trang chọn loại tài khoản (Trung tâm / Solo).
2. Khi tạo tài khoản (server action):
   - **Trung tâm:** tạo Clerk Org → user thành `org:admin`; set `role="admin"`; **không** tạo Teacher.
   - **Solo:** tạo Clerk Org 1 người → user thành `org:admin`; set `role="admin"`; **tạo `Teacher`**
     (id = userId, `orgId` = org vừa tạo) — D1.
   - Lưu `orgType` ("solo"/"center") vào org `publicMetadata` cho onboarding/hiển thị (scoping
     **không** phụ thuộc cột này — "chế độ trung tâm" cho dạy thay vẫn suy ra bằng số GV ≥ 2 như hiện tại, D4).

**GV thành viên KHÔNG tự đăng ký** — do admin trung tâm mời/cấp.

---

## Cấp giáo viên (admin trung tâm)

> **Chốt (2026-08-10): admin tạo TRỰC TIẾP, KHÔNG dùng email.** Đã code thử luồng mời qua Clerk
> Organization Invitation (GV tự đặt mật khẩu) rồi **bỏ cho đơn giản** — trung tâm cấp tài khoản tay.

- `createTeacher` (actions.ts): tạo Clerk user (`username` + `password` do admin đặt, `role="teacher"`,
  `orgId`) → thêm `createOrganizationMembership` (`org:member`) → tạo `Teacher` row. Email chỉ là field
  **liên hệ tuỳ chọn** (không xác minh). Rollback: xoá Clerk user nếu bước sau lỗi.
- `updateTeacher`: sửa hồ sơ DB + đổi `username`/`password` GV trên Clerk. `deleteTeacher`: xoá cả Clerk user.
- **Solo KHÔNG được thêm GV** (guard `orgType==="solo"`) — solo = một mình.
- **Hạn mức** (dưới) chặn trước khi tạo.

## Hạn mức giáo viên (freemium) ✅ (2026-08-10)

- Mỗi org: `publicMetadata.teacherLimit` (mặc định **3**). `createTeacher` chặn khi
  **số Teacher + lời mời pending ≥ limit** → trả `code:"LIMIT"` → [TeacherForm](../src/components/forms/TeacherForm.tsx)
  bung popup xin nâng → `requestTeacherLimit` set cờ `upgradeRequested` trên org.
- Super-admin ở `/platform` thấy cột **Hạn mức GV** + badge "đã xin nâng" → `setOrgTeacherLimit` đặt số mới
  (xoá cờ). ponytail: chưa có cổng thanh toán — super-admin duyệt tay; thêm Stripe khi cần tự động thu.

---

## Cấu hình Clerk cần chỉnh

- ✅ **Đã bật Organizations** (2026-08-08).
- ✅ Bật **Sign-up** (đăng ký công khai).
- ✅ **Xác minh email** (2026-08-10): bật **Sign-up with email** + **Verify at sign-up** (Email verification
  code). **Để "Require email address" = OFF** (bật ON sẽ buộc mọi user có email, gãy luồng cũ username-only).
- ⚠️ **KHÔNG** bật "require organization" / ép chọn org toàn cục — vì super-admin phải **org-less**.
  Cho phép personal account tồn tại; app tự xử: role=superadmin → không cần org; admin/teacher → có org.
- Session token: claim `metadata` = `{{user.public_metadata}}` (đã cấu hình). **`orgId` lưu TRONG
  `publicMetadata`** và đọc qua `sessionClaims.metadata.orgId` (đồng bộ, ổn định) — KHÔNG dùng "active
  organization" của `auth()` (mong manh, cần client `setActive`). Gán `publicMetadata.orgId` lúc tạo tài khoản.

---

## Việc phải làm (theo pha)

- **A. Schema + migration:** thêm `orgId` vào 6 bảng; seed/gán org mẫu cho data test.
- **B. Scoping:** viết `getScope()`; áp vào tất cả list pages + mutations; thêm golden rule.
- **C. Đăng ký:** bật sign-up; trang chọn loại; provisioning (tạo org, tạo Teacher cho solo).
- **D. Mời GV:** `createTeacher` gắn org membership + `orgId`.
- **E. `/platform`:** panel super-admin (list org + số liệu + khoá/xoá); thêm vào `routeAccessMap`.
- **F. Middleware:** đọc `orgId`+`role`; bypass cho `superadmin`; chặn route chéo tenant.
- **G. Security review:** rà cách ly tenant — chỗ nào quên `orgId` là rò.

---

## Rủi ro cần cẩn thận

- **Rò tenant**: một query quên `orgId` = lộ dữ liệu chéo trung tâm → gom scoping vào 1 helper + review kỹ (G).
- **Bypass super-admin** phải là **đúng một chỗ**, dễ audit.
- **Clerk free (Hobby)** có giới hạn số org hoạt động — kiểm tra trước khi lên production.
