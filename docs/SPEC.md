# SPEC — Web quản lý trung tâm dạy nhạc

> Tài liệu nghiệp vụ (functional spec). Chốt ngày 2026-08-03. Là mốc tham chiếu cho việc dựng
> lại app theo đúng tầm nhìn. Kiến trúc code hiện tại: [ARCHITECTURE.md](ARCHITECTURE.md) ·
> quy tắc: [../CLAUDE.md](../CLAUDE.md).

## 0. Một câu tóm tắt

Web **public, multi-tenant** quản lý **giáo viên + học viên** cho **trung tâm dạy nhạc** — mỗi
trung tâm (hoặc GV solo) tự đăng ký và quản dữ liệu riêng của mình. Trong một trung tâm: nhiều
giáo viên, mỗi GV phụ trách nhiều lớp; hai loại lớp: **lớp trung tâm** (1 GV – nhiều HV) và
**gia sư** (1 GV – 1 HV). Hệ thống lo: hồ sơ, xếp lớp, **điểm danh**, **học phí** và **lương giáo
viên**. (Kiến trúc tenant: [DESIGN-multi-tenant.md](DESIGN-multi-tenant.md).)

---

## 1. Vai trò & phân quyền

> ⚠️ **Cập nhật 2026-08-08 — app thành PUBLIC + multi-tenant.** Bảng dưới là phân quyền
> *trong một trung tâm*. Trên nó có thêm tầng **super-admin** (chủ hệ thống, thấy mọi trung
> tâm) và mọi dữ liệu tách theo `orgId`. Xem [DESIGN-multi-tenant.md](DESIGN-multi-tenant.md).

| Vai trò | Đăng nhập | Phạm vi |
|---|---|---|
| **Super-admin** (chủ hệ thống) | ✅ | Mọi trung tâm; chỉ quản tài khoản + số liệu tổng (trang `/platform`) |
| **Trung tâm (admin)** | ✅ | Toàn quyền **trong trung tâm của mình**: giáo viên (+ **lương**), lớp, học viên, phụ huynh, học phí |
| **Giáo viên** | ✅ | Chỉ **của mình** (trong trung tâm): lớp mình phụ trách, học viên mình phụ trách, điểm danh, học phí, lương của mình |
| Học viên / Phụ huynh | ❌ (giai đoạn này) | Chỉ là **dữ liệu**; chưa có portal đăng nhập |

**Quy tắc data scoping (đã chốt ở D2 + multi-tenant):** học viên gán **trực tiếp** cho GV qua
`Student.ownerTeacherId`; lớp qua `Class.teacherId`. Màn hình GV lọc theo chủ sở hữu; admin lọc
theo `orgId` của mình; super-admin không lọc.

---

## 2. Đối tượng dữ liệu

| Đối tượng | Vai trò | Ghi chú |
|---|---|---|
| **Giáo viên** | Người dạy | Hồ sơ + bộ môn/nhạc cụ + **tham số lương riêng** (đơn giá gia sư, mốc cố định lớp TT, hệ số/HS) |
| **Lớp** | Đơn vị dạy | Thuộc 1 GV; **loại**: `Trung tâm` / `Gia sư`; lịch cố định theo thứ trong tuần + giờ |
| **Học viên** | Người học | Hồ sơ + **học phí/buổi** + phụ huynh; xếp vào nhiều lớp |
| **Phụ huynh** | Liên hệ | Gắn với học viên |
| **Buổi học** | 1 lần lớp diễn ra | Trạng thái buổi: sắp tới / đã dạy / nghỉ |
| **Điểm danh học viên** 🆕 | HV nào đi buổi nào | Nền để tính học phí & lương |
| **Học phí tháng** | Theo HV, theo tháng | Đã / chưa đóng |
| **Bảng lương tháng** 🆕 | Theo GV, theo tháng | Tính từ điểm danh |
| **Bài giảng PDF** ⏳ | Tài liệu | Pha sau |

---

## 3. Các module chức năng

### 3.1 Quản lý giáo viên — *(admin)* 🆕
CRUD hồ sơ giáo viên, gán bộ môn/nhạc cụ, cấu hình **tham số lương của từng GV**.

### 3.2 Quản lý lớp — *(admin + GV)* 🔧
CRUD lớp, **gán giáo viên**, chọn **loại lớp** (trung tâm/gia sư), xếp học viên, đặt lịch tuần + giờ.

### 3.3 Quản lý học viên — *(admin + GV)* ✅
CRUD hồ sơ, ảnh, **học phí/buổi**, gắn phụ huynh, xếp lớp. GV chỉ thấy HV trong lớp mình.

### 3.4 Quản lý phụ huynh — *(admin + GV)* ✅
CRUD, liên kết học viên. Không đăng nhập.

### 3.5 Điểm danh — 🔧 (2 tầng)
- **Tầng buổi** (có sẵn): buổi đã dạy / nghỉ / sắp tới → dùng cho lương gia sư & xác định buổi hợp lệ.
- **Tầng học viên** 🆕: tick từng HV có mặt trong mỗi buổi → nguồn dữ liệu cho **học phí** và **lương lớp trung tâm**.

### 3.6 Học phí — *(admin + GV)* 🔧
- Tính theo **số buổi HV thực đi × đơn giá/buổi (của HV)**, gộp theo tháng.
- Trạng thái **đã / chưa đóng** + danh sách **nhắc học phí**.
- *(Nợ kỹ thuật: form nhập/tạo học phí `createTuition` chưa hoàn chỉnh.)*

### 3.7 Lương giáo viên — *(admin xem tất cả; GV xem của mình)* 🆕
Tính theo **tháng**, dựa trên điểm danh, công thức **theo loại lớp** (tham số lấy từ hồ sơ GV):

- **Gia sư:** `số buổi đã học trong tháng × đơn giá/buổi`.
- **Lớp trung tâm (tính từng buổi rồi cộng dồn):**
  `Σ_mỗi_buổi ( mốc_cố_định + số_HS_có_mặt_buổi_đó × hệ_số )`.

  > ⚠️ **GIẢ ĐỊNH:** "mốc cố định" tính **theo BUỔI**. Nếu thực tế là mốc **/tháng**, chỉ cần đổi cách
  > cộng dồn (cộng mốc 1 lần/tháng thay vì mỗi buổi) — không đổi schema.

### 3.8 Dashboard — *(admin & GV, scope khác nhau)* 🔧
- Admin: tổng quan trung tâm (số lớp/HV/GV, doanh thu học phí, tổng lương, nhắc thu).
- GV: tổng quan của mình (lớp, học viên, lịch dạy, lương dự kiến).

### 3.9 Lịch dạy — ✅
Lịch tuần + **tự sinh buổi học theo tháng** (logic bulk đã có trong `lib/actions.ts`).

### 3.10 Bài giảng (PDF) — ⏳ pha sau
Lưu tài liệu PDF gắn theo lớp; GV/admin xem.

---

## 4. Luồng tính toán xương sống

```
        ĐIỂM DANH HỌC VIÊN  (HV nào có mặt ở buổi nào)
                    │
      ┌─────────────┴──────────────┐
      ▼                            ▼
   HỌC PHÍ (theo HV/tháng)      LƯƠNG GV (theo GV/tháng)
   = số buổi HV đi × đơn giá     • Gia sư:  số buổi × đơn giá
     → gộp tháng → nhắc đóng     • Lớp TT:  Σ(mốc cố định + số HS buổi × hệ số)
```

Một nguồn dữ liệu điểm danh nuôi cả hai phía → là phần nền quan trọng nhất, phải chính xác.

---

## 5. Phạm vi theo pha

| ✅ Tận dụng lại | 🆕 Xây mới (Pha 1–2) | ⏳ Để sau |
|---|---|---|
| Học viên, Phụ huynh (CRUD) | Model **Giáo viên** + CRUD | Bài giảng PDF |
| Lớp, lịch tuần, tự sinh buổi | `Class.teacherId` + `Class.type` | Portal đăng nhập HV/PH |
| Buổi học + điểm danh cấp buổi | **Điểm danh cấp học viên** (Attendance) | Báo cáo tài chính nâng cao |
| Học phí tháng (MonthlyTuition) | **Engine lương** theo loại lớp (TeacherSalary) | |
| Phân quyền Clerk (nền) | **Data scoping theo giáo viên** | |
| | Hoàn thiện tạo/nhắc **học phí** | |

**Lộ trình đề xuất:**
1. **Pha 1 — Nền giáo viên & lớp:** model Teacher + CRUD, gán teacher + loại cho Class, scoping theo GV.
2. **Pha 2 — Điểm danh HV → Học phí → Lương:** Attendance, tính học phí từng HV, engine lương theo tháng.
3. **Pha 3 — Bài giảng PDF** + hoàn thiện dashboard.

Schema đề xuất kèm theo: [schema.proposed.prisma](schema.proposed.prisma) *(bản nháp để duyệt, chưa áp dụng)*.
