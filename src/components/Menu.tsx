import { getScope } from "@/lib/scope";
import { isSoloAdmin } from "@/lib/solo";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import LogoutButton from "./LogoutButton";

// `key` = khoá dịch trong messages/*.json ("Menu" namespace).
const menuItems = [
  {
    titleKey: "section_menu",
    items: [
      { icon: "/home.png", key: "home", href: "/", visible: ["admin", "teacher", "parent"] },
      { icon: "/teacher.png", key: "teachers", href: "/list/teachers", visible: ["admin"] },
      { icon: "/student.png", key: "students", href: "/list/students", visible: ["admin", "teacher"] },
      { icon: "/class.png", key: "classes", href: "/list/classes", visible: ["admin", "teacher"] },
      { icon: "/lesson.png", key: "lessons", href: "/list/lessons", visible: ["admin", "teacher"] },
      { icon: "/announcement.png", key: "tuition", href: "/list/announcements", visible: ["admin", "teacher", "parent"] },
      { icon: "/finance.png", key: "salary", href: "/list/salary", visible: ["admin", "teacher"] },
    ],
  },
  {
    titleKey: "section_other",
    items: [
      { icon: "/profile.png", key: "profile", href: "/profile", visible: ["admin", "teacher", "parent"] },
      { icon: "/setting.png", key: "settings", href: "/settings", visible: ["admin", "teacher", "parent"] },
      { icon: "/logout.png", key: "logout", href: "/logout", visible: ["admin", "teacher", "parent"] },
    ],
  },
];

const Menu = async () => {
  const scope = getScope();
  const role = scope.role as string;
  const t = await getTranslations("Menu");

  // Solo → nhãn "Giáo viên" đổi thành "Lịch dạy của tôi". Nhận diện độc lập active org (lib/solo).
  const isSolo = role === "admin" && (await isSoloAdmin(scope.userId));
  return (
    <div className="mt-4 text-sm">
      {menuItems.map((group) => (
        <div className="flex flex-col gap-2" key={group.titleKey}>
          <span className="hidden lg:block text-gray-400 font-light my-4">
            {t(group.titleKey)}
          </span>
          {group.items.map((item) => {
            if (item.visible.includes(role)) {
              if (item.href === "/logout") {
                return <LogoutButton key={item.key} icon={item.icon} label={t("logout")} />;
              }
              const label =
                item.href === "/list/teachers" && isSolo ? t("my_schedule") : t(item.key);
              return (
                <Link
                  href={item.href}
                  key={item.key}
                  className="flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md hover:bg-lucasSkyLight"
                >
                  <Image src={item.icon} alt="" width={20} height={20} />
                  <span className="hidden lg:block">{label}</span>
                </Link>
              );
            }
          })}
        </div>
      ))}
    </div>
  );
};

export default Menu;
