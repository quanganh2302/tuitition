export const ITEM_PER_PAGE = 15

type RouteAccessMap = {
  [key: string]: string[];
};

export const routeAccessMap: RouteAccessMap = {
  "/platform(.*)": ["superadmin"],
  "/admin(.*)": ["admin"],
  "/teacher(.*)": ["teacher"],
  "/parent(.*)": ["parent"],
  "/list/teachers(.*)": ["admin"],
  "/list/students(.*)": ["admin", "teacher"],
  "/list/parents(.*)": ["admin", "teacher"],
  "/list/classes(.*)": ["admin", "teacher"],
  "/list/lessons(.*)": ["admin", "teacher", "parent"],
  "/list/announcements(.*)": ["admin", "teacher", "parent"],
  "/list/salary(.*)": ["admin", "teacher"],
};