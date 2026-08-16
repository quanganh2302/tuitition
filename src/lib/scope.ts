import { auth } from "@clerk/nextjs/server";

// ===== TENANT SCOPING (multi-tenant, Phase B) =====
// Nguồn chân lý: docs/DESIGN-multi-tenant.md.
// 3 tầng: super-admin (org-less, thấy tất cả) · admin trung tâm (lọc theo orgId) · teacher (orgId + sở hữu).

export type Scope = {
  userId: string | null;
  role?: string;
  orgId: string | null;
  isSuperAdmin: boolean;
};

// Vai trò + tenant (orgId) của người dùng hiện tại.
// GỌI TRONG thân hàm/component (golden rule #1 — không ở top-level module).
// orgId lấy từ publicMetadata (claim `metadata` trong session token) — ĐỒNG BỘ, KHÔNG phụ thuộc
// "active organization" của session (vốn mong manh: client phải setActive, điều hướng không re-run).
// Gán publicMetadata.orgId lúc tạo tài khoản (provisionAccount / createTeacher). Xem docs/DESIGN-multi-tenant.md.
export const getScope = (): Scope => {
  const { userId, sessionClaims } = auth();
  const meta = sessionClaims?.metadata as { role?: string; orgId?: string } | undefined;
  const role = meta?.role;
  return { userId, role, orgId: meta?.orgId ?? null, isSuperAdmin: role === "superadmin" };
};

// Điều kiện tenant để MERGE vào where của model có cột orgId (Teacher/Student/Class/Parent/ClassSession/MonthlyTuition).
//   super-admin  → {}  (không lọc, thấy mọi trung tâm)
//   còn lại      → { orgId }  — nếu không có org thì khớp sentinel không tồn tại (FAIL-CLOSED:
//                  tránh lộ dữ liệu orgId=null; thà thấy rỗng còn hơn thấy chéo tenant).
export const orgWhere = (scope: Scope): { orgId?: string } =>
  scope.isSuperAdmin ? {} : { orgId: scope.orgId ?? "__no_org__" };
