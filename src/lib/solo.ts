import prisma from "./prisma";

// Solo = admin CÓ hồ sơ Teacher (id = userId) + là GV DUY NHẤT trong org của họ.
// Dùng orgId TỪ chính bản ghi Teacher (KHÔNG dùng active org của session) → ổn định:
// không bị sai khi session chưa kịp set active organization. Dùng chung cho Menu / dashboard / redirect.
export const isSoloAdmin = async (
  userId: string | null | undefined
): Promise<boolean> => {
  if (!userId) return false;
  const self = await prisma.teacher.findUnique({
    where: { id: userId },
    select: { orgId: true },
  });
  if (!self) return false; // không có hồ sơ Teacher → là admin trung tâm, không phải solo
  const count = await prisma.teacher.count({ where: { orgId: self.orgId } });
  return count === 1;
};
