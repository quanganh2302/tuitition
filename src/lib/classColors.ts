// 5 màu cố định cho lịch lớp học (chọn ở ClassForm, áp cho lớp PRIVATE).
// Lớp CENTER dùng chung DEFAULT_CENTER_COLOR — chưa cho chọn riêng (theo yêu cầu "trước mắt").
export const CLASS_COLORS = [
  { key: "sky", bg: "#C3EBFA" },
  { key: "yellow", bg: "#FAE27C" },
  { key: "purple", bg: "#CFCEFF" },
  { key: "pink", bg: "#FBCFE8" },
  { key: "green", bg: "#BBF7D0" },
] as const;

export type ClassColorKey = (typeof CLASS_COLORS)[number]["key"];

export const DEFAULT_CENTER_COLOR: ClassColorKey = "purple";
export const DEFAULT_PRIVATE_COLOR: ClassColorKey = "sky";

export const getClassColor = (key?: string | null) =>
  CLASS_COLORS.find((c) => c.key === key) ?? CLASS_COLORS[0];
