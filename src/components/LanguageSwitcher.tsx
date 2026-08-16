"use client";

import { useTranslations } from "next-intl";

// Chuyển đổi ngôn ngữ (thay icon message cũ). Toggle bấm-là-đổi vi ↔ en, lưu cookie `locale`.
const LanguageSwitcher = ({ current }: { current: string }) => {
  const t = useTranslations("Language");
  const next = current === "vi" ? "en" : "vi";
  const toggle = () => {
    document.cookie = `locale=${next}; path=/; max-age=31536000`;
    window.location.reload();
  };

  return (
    <button
      onClick={toggle}
      title={t("switch_to", { lang: t(next) })}
      className="bg-white rounded-full h-7 px-2 flex items-center gap-1 cursor-pointer text-xs font-medium text-gray-600 hover:text-black"
    >
      {/* Globe icon (SVG — luôn render, không như flag emoji) */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <span className="uppercase">{current}</span>
    </button>
  );
};

export default LanguageSwitcher;
