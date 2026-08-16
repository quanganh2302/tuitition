# Thiết kế: Phân quyền theo sở hữu + Dạy thay

> Ghi lại brainstorm 2026-08-03. Có phần **CHỐT** và phần **CÒN MỞ** (chờ quyết định).
> Bổ sung cho [SPEC.md](SPEC.md). Khi các quyết định được chốt sẽ cập nhật SPEC + schema.
>
> ⚠️ **Cập nhật 2026-08-08:** mô hình SỞ HỮU + DẠY THAY dưới đây vẫn đúng, nhưng giờ chạy
> **bên trong một trung tâm (tenant)** — app đã thành public/multi-tenant. Chỗ nào ghi "admin thấy
> tất cả" = admin **của trung tâm đó** (lọc theo `orgId`), không phải toàn hệ thống. Xem
> [DESIGN-multi-tenant.md](DESIGN-multi-tenant.md).

## Bối cảnh: app chạy 2 chế độ

App phải dùng được cho **cả giáo viên đơn lẻ lẫn trung tâm nhiều giáo viên**:
- 1 giáo viên tự dùng để quản học sinh/lớp/học phí/thu nhập của mình.
- 1 trung tâm quản nhiều giáo viên + lương + toàn cảnh.

→ Kéo theo mô hình quyền không thể là "admin làm được, teacher chỉ xem".

## CHỐT: Mô hình quyền theo SỞ HỮU (ownership-based)

- Mỗi bản ghi vận hành (học sinh, lớp, học phí, buổi) có một **giáo viên sở hữu**.
- **Giáo viên = toàn quyền CRUD trên phần của mình** (không chỉ xem).
- **Admin/trung tâm = tập cha**: thấy & quản lý xuyên suốt mọi giáo viên + tài khoản GV + tham số lương + chốt/trả lương.
- **Tạo ở cấp nào thì cấp đó sở hữu**:
  - Teacher tạo → tự gán sở hữu = chính họ.
  - Admin tạo → admin chọn giáo viên sở hữu (hoặc gán sau).
- Teacher **không** tự sửa tham số lương của mình (chỉ admin). Solo mode vẫn chạy vì solo = admin (xem D1).

### Ma trận quyền

| Trang | Teacher (phần của mình) | Admin (tất cả) |
|---|---|---|
| Học sinh | tạo/sửa/xem (tạo là tự gán vào lớp mình) | toàn bộ, chọn GV sở hữu |
| Phụ huynh | của HS mình | tất cả |
| Lớp | tạo/sửa lớp mình | tất cả + gán GV |
| Điểm danh | buổi lớp mình + buổi mình dạy thay | tất cả |
| Học phí | HS lớp mình (đánh dấu đã đóng) | tất cả |
| Lương | chỉ XEM lương mình | tất cả + tham số + chốt/trả |
| Giáo viên | không vào | CRUD |

## CHỐT: Mô hình "Dạy thay" (substitute)

Tách 3 khái niệm từng bị gộp:
- **Chủ lớp** = `Class.teacherId` (định giá, lịch, sở hữu).
- **Người dạy buổi đó** = `ClassSession.taughtById` *(field MỚI, cần thêm ở Pha 2)*; mặc định = chủ lớp, đổi khi có người dạy thay.
- **Học viên đóng tiền** = không đổi dù ai dạy.

Hệ quả:
- **Lương tính theo `taughtById`** (không theo chủ lớp), áp cho cả lớp trung tâm & gia sư. → sửa SPEC §3.7: duyệt buổi `TAUGHT` nhóm theo `taughtById`.
- **Scoping**: "buổi của tôi" = buổi thuộc lớp tôi **HOẶC** buổi có `taughtById = tôi` (để người dạy thay điểm danh được).
- **Học phí & điểm danh học viên**: KHÔNG đổi (HV vẫn đóng tiền lớp; vẫn điểm danh ai đi học).

## Quyết định (đã chốt 2026-08-03)

- **D1. ✅ Danh tính solo:** người dùng đơn lẻ = tài khoản **admin có kèm hồ sơ `Teacher`** — vừa quản lý vừa dạy (có lương). Trung tâm = 1+ admin + nhiều teacher thuần.
- **D2. ⏳ Sở hữu học sinh (đề xuất (b), chờ xác nhận cuối):** thêm `Student.ownerTeacherId` (giáo viên phụ trách chính) để HS tồn tại được khi chưa vào lớp. Scoping "HS của tôi" = `ownerTeacherId = tôi`. Teacher tạo → tự gán mình; admin tạo → chọn GV phụ trách. (Phương án (a) "chỉ qua lớp" bị bỏ vì HS chưa vào lớp sẽ biến mất khỏi màn hình GV — không hợp solo.)
- **D3. ✅ Dạy thay tính đơn giá của CHỦ LỚP:** mỗi buổi có "giá trị" cố định theo tham số lương của chủ lớp; giá trị đó trả cho người thực dạy (`taughtById`), KHÔNG dùng tham số của người dạy thay.
- **D4. ✅ Dạy thay CHỈ ở chế độ trung tâm, do admin gán.** Solo không có dạy thay (1 giáo viên). → `taughtById` mặc định = chủ lớp; chỉ admin được đổi sang GV khác.

### Công thức lương (cập nhật theo D3)
Lương GV X tháng M = Σ các buổi `TAUGHT` có `taughtById = X`, mỗi buổi tính bằng **tham số lương của CHỦ LỚP** theo `Class.type`:
- Chủ lớp là gia sư → giá trị buổi = `privateRatePerSession` (của chủ lớp).
- Chủ lớp là lớp TT → giá trị buổi = `centerBasePerSession + (số HS có mặt × centerRatePerStudent)` (của chủ lớp).

## Ảnh hưởng schema (khi triển khai Pha 2)
- `ClassSession.taughtById` → Teacher (nullable, default/hiểu ngầm = chủ lớp) — cho dạy thay + gom lương. Chỉ admin đổi được.
- `Student.ownerTeacherId` → Teacher (nullable) — theo D2(b). Scoping HS theo cột này.
