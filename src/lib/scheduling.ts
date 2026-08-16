import { toVietnamMidnightUTC } from "./utils";

export const WEEKDAY_NUM: Record<string, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

// Các lần lặp của `day` (thứ trong tuần) có ngày-lịch-VN nằm trong [fromLocal, toLocal] (bao gồm 2 đầu),
// trả về dạng nửa-đêm-VN-mã-hoá-UTC (khớp cách lưu ClassSession.date — golden rule #8).
export function weekdayOccurrences(
  day: string,
  fromLocal: Date,
  toLocal: Date
): Date[] {
  const weekday = WEEKDAY_NUM[day];
  if (weekday === undefined) return [];
  const res: Date[] = [];
  const cursor = new Date(
    fromLocal.getFullYear(),
    fromLocal.getMonth(),
    fromLocal.getDate()
  );
  const end = new Date(toLocal.getFullYear(), toLocal.getMonth(), toLocal.getDate());
  while (cursor <= end) {
    if (cursor.getDay() === weekday) res.push(toVietnamMidnightUTC(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return res;
}
