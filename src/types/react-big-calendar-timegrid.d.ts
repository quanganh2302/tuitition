// @types/react-big-calendar không có định nghĩa cho subpath nội bộ này — cần để tự dựng view "3 ngày"
// (đúng cách rbc tự viết view Tuần, xem BigCalender.tsx).
declare module "react-big-calendar/lib/TimeGrid" {
  import { ComponentType } from "react";
  const TimeGrid: ComponentType<any>;
  export default TimeGrid;
}
