// IT APPEARS THAT BIG CALENDAR SHOWS THE LAST WEEK WHEN THE CURRENT DAY IS A WEEKEND.
// FOR THIS REASON WE'LL GET THE LAST WEEK AS THE REFERENCE WEEK.
// IN THE TUTORIAL WE'RE TAKING THE NEXT WEEK AS THE REFERENCE WEEK.

const getLatestMonday = (): Date => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const latestMonday = today;
  latestMonday.setDate(today.getDate() - daysSinceMonday);
  return latestMonday;
};

export const adjustScheduleToCurrentWeek = (
  lessons: { title: string; start: Date; end: Date }[]
): { title: string; start: Date; end: Date }[] => {
  const latestMonday = getLatestMonday();

  return lessons.map((lesson) => {
    const lessonDayOfWeek = lesson.start.getDay();

    const daysFromMonday = lessonDayOfWeek === 0 ? 6 : lessonDayOfWeek - 1;

    const adjustedStartDate = new Date(latestMonday);

    adjustedStartDate.setDate(latestMonday.getDate() + daysFromMonday);
    adjustedStartDate.setHours(
      lesson.start.getHours(),
      lesson.start.getMinutes(),
      lesson.start.getSeconds()
    );
    const adjustedEndDate = new Date(adjustedStartDate);
    adjustedEndDate.setHours(
      lesson.end.getHours(),
      lesson.end.getMinutes(),
      lesson.end.getSeconds()
    );

    return {
      title: lesson.title,
      start: adjustedStartDate,
      end: adjustedEndDate,
    };
  });
};

// Chuẩn hoá tên để search không dấu: bỏ dấu thanh + đổi đ→d + viết thường.
// Dùng cả lúc lưu (searchName) lẫn lúc search để nhất quán.
export const normalizeVN = (s: string): string =>
  (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();

// Intl.DateTimeFormat("vi-VN", {weekday/month:"long"}) trả chữ thường ("thứ hai", "tháng 8") —
// viết hoa chữ cái đầu cho khớp UI.
export const capitalizeFirst = (s: string): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

export const toVietnamMidnightUTC = (date: Date): Date => {
  const vietnamOffset = 7 * 60; // UTC+7 in minutes
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return new Date(utc - vietnamOffset * 60 * 1000);
};

// URL ảnh nền random (Picsum, free, không cần key) — đổi ảnh khác mỗi lần render (mỗi lần load trang).
// Không optimize qua next/image (không cần thiết cho ảnh trang trí), dùng trực tiếp làm CSS backgroundImage.
export const randomBgImage = (w = 600, h = 400): string => {
  const seed = Math.floor(Math.random() * 100000);
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
};

export const getVietnamDateRangeThisWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;

  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const vietnamOffsetMs = 7 * 60 * 60 * 1000;
  return {
    from: new Date(monday.getTime() - vietnamOffsetMs),
    to: new Date(sunday.getTime() - vietnamOffsetMs),
  };
};
