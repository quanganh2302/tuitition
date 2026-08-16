---
name: add-crud-resource
description: Công thức chuẩn để thêm hoặc sửa một resource CRUD (list page + form + server action) trong app DASHBOARD_UI Next.js/Prisma/Clerk. Dùng skill này khi thêm entity mới (vd giáo viên, bài tập, khoản thu) hoặc thêm chức năng tạo/sửa/xoá cho một model, để không phá cấu trúc và ranh giới server/client hiện có.
---

# Thêm / sửa một resource CRUD

App này có pattern CRUD lặp lại rất chặt. Làm theo đúng thứ tự dưới đây; đối chiếu với một
resource đã có (khuyên dùng **Parent** — đơn giản nhất, hoặc **Student** nếu cần Clerk/ảnh).

Tham chiếu: [CLAUDE.md](../../../CLAUDE.md) · [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md).

## Trước khi bắt đầu
- Xác định model trong `prisma/schema.prisma`. Nếu chưa có/thiếu field:
  sửa schema → `npx prisma migrate dev --name <mô_tả>` → `npx prisma generate`. **Rồi mới** code TS.
- Chọn `<key>` cho resource (số ít, thường trùng tên model viết thường): vd `"teacher"`.

## 6 bước (mỗi bước 1 vùng file)

### 1. Zod schema — `src/lib/formValidationSchemas.ts`
- Thêm `export const <key>Schema = z.object({ ... })` và `export type <Key>Schema = z.infer<...>`.
- `id` optional (create không có, update có). Enum phải mirror enum Prisma (dùng các `*Enum` sẵn có).
- Field bắt buộc kèm `message` lỗi. Số dùng `z.coerce.number()`, ngày `z.coerce.date()`.

### 2. Server action — `src/lib/actions.ts` (đầu file đã có `"use server"`)
Thêm 3 hàm, trả về `{ success: boolean, error: boolean }`:
```ts
export const create<Key> = async (currentState: CurrentState, data: <Key>Schema) => {
  try { await prisma.<model>.create({ data: { ...map field... } });
        return { success: true, error: false }; }
  catch (err) { console.log(err); return { success: false, error: true }; }
};
export const update<Key> = async (currentState: CurrentState, data: <Key>Schema) => { /* prisma.update where id */ };
export const delete<Key> = async (currentState: CurrentState, data: FormData) => {
  const id = data.get("id") as string; /* prisma.delete where id */ };
```
- Quan hệ M-N: `create` → `connect`, `update` → `set`.
- Nếu entity gắn Clerk (như Student): tạo/sửa/xoá user Clerk và **rollback** khi Prisma lỗi.
- Ngày buổi học: bọc `toVietnamMidnightUTC()`.

### 3. Form — `src/components/forms/<Key>Form.tsx` (`"use client"`)
Copy khung từ `ParentForm.tsx`. Bắt buộc có:
- `useForm<<Key>Schema>({ resolver: zodResolver(<key>Schema) })`.
- `const [state, formAction] = useFormState(type === "create" ? create<Key> : update<Key>, {success:false,error:false})`.
- `const onSubmit = handleSubmit((d) => formAction(d));`
- `useEffect` theo dõi `state.success` → `toast(...)` + `setOpen(false)` + `router.refresh()`.
- Field text dùng `<InputField ... register={register} error={errors.x} />`; dropdown lấy option từ `relatedData`.
- Props: `{ type, data, setOpen, relatedData }`.

### 4. Nạp relatedData — `src/components/FormContainer.tsx`
- Thêm `<key>` vào union `table` của `FormContainerProps`.
- Thêm `case "<key>":` fetch các option cần cho dropdown (vd danh sách student/class) → gán `relatedData`.

### 5. Đăng ký form + delete — `src/components/FormModal.tsx`
- `import { delete<Key> } from "@/lib/actions"` và thêm vào map `deleteAction`.
- `const <Key>Form = dynamic(() => import("./forms/<Key>Form"), { loading: ... })`.
- Thêm entry `<key>: (setOpen, type, data, relatedData) => <<Key>Form .../>` vào object `forms`.

### 6. Trang danh sách — `src/app/(Belu)/list/<resource>/page.tsx`
Copy khung từ `parents/page.tsx`. Bắt buộc:
```ts
const <Name>Page = async ({ searchParams }: { searchParams: {...} }) => {
  const { sessionClaims } = auth();                         // ⬅ TRONG component, KHÔNG ngoài module
  const role = (sessionClaims?.metadata as {role?:string})?.role;
  const columns = [ ..., ...(role === "admin" ? [{header:"Actions",...}] : []) ];  // ⬅ cũng trong component
  const { page, ...queryParams } = searchParams;
  const p = page ? parseInt(page) : 1;
  const query: Prisma.<Model>WhereInput = {};
  // map queryParams.search → query.<field> = { contains: value, mode: "insensitive" }
  const [data, count] = await prisma.$transaction([
    prisma.<model>.findMany({ where: query, take: ITEM_PER_PAGE, skip: ITEM_PER_PAGE*(p-1), include: {...} }),
    prisma.<model>.count({ where: query }),
  ]);
  return (<div>... <TableSearch/> <FormContainer table="<key>" type="create"/> ...
          <Table columns={columns} renderRow={renderRow} data={data}/> <Pagination page={p} count={count}/></div>);
};
```
- `renderRow` render `<FormContainer table="<key>" type="update" data={item}/>` và `type="delete" id={item.id}` (chỉ khi `role==="admin"`).

### 7. Phân quyền + menu
- Thêm route vào `routeAccessMap` (`src/lib/settings.ts`) với các role được phép.
- Thêm mục vào `menuItems` (`src/components/Menu.tsx`) với `visible: [...role]` (icon trong `/public`).

## ✅ Checklist trước khi xong
- [ ] `auth()` và `columns` nằm **trong** component (không top-level) — nếu không, `next build` fail.
- [ ] Không import server component vào file `"use client"`.
- [ ] Action trả `{ success, error }`; delete đọc id từ `FormData`.
- [ ] Đã thêm `<key>` vào cả `FormContainerProps.table`, `FormModal.forms`, `FormModal.deleteAction`.
- [ ] Dùng lại `Table/Pagination/TableSearch/InputField` + màu `lucas*`.
- [ ] `npx tsc --noEmit` = 0 lỗi; `npx next build` pass.
- [ ] Nếu đổi schema: đã chạy `migrate dev` + `generate` trước khi build.

## Cạm bẫy đặt tên (xem docs/ARCHITECTURE.md §2)
- `"lesson"` = **ClassSession**, `"announcement"` = **MonthlyTuition (học phí)**. Đừng nhầm khi đặt key mới.
