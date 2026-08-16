"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";

// Nút hỗ trợ nổi góc phải-dưới (Figma "Library / Support Channels"): đóng = 1 nút tròn 56px,
// mở = panel 360px chọn kênh. Icon lấy nguyên từ Figma → public/support/*.
// Hiện MỚI LÀ GIAO DIỆN: chatbot chưa nối, 2 kênh chat mở link ngoài — điền link thật ở đây.
const LINKS = {
  messenger: "https://m.me/", // TODO: m.me/<page-id>
  zalo: "https://zalo.me/", // TODO: zalo.me/<số điện thoại hoặc OA id>
  hotline: "tel:", // TODO: tel:+84...
};

// Token màu/đổ bóng lấy từ biến Figma.
const BRAND = "#FDDA0D";
const SHADOW = "0 4px 8px #00000014, 0 1px 2px #0000000F";

// Hình học đúng theo Figma trong khung chuẩn 56px, quy ra % để dùng lại được cho cả nút 56px
// lẫn icon 44px trong panel. Mascot chatbot CỐ TÌNH tràn khỏi vòng tròn (lệch phải–dưới).
const pct = (v: number) => `${(v / 56) * 100}%`;
const CIRCLE = { left: pct(5), top: pct(5), width: pct(46), height: pct(46) };
const LOGO = { left: pct(4), top: pct(4), width: pct(48), height: pct(48) };
const HEADPHONES = { left: pct(18.25), top: pct(18.8), width: pct(19.5), height: pct(18.4) };

const CHANNELS = [
  {
    key: "chatbot",
    src: "/support/chatbot.png",
    bg: "#000000",
    art: { left: pct(15), top: pct(10), width: pct(52), height: pct(52) },
    href: undefined as string | undefined,
  },
  { key: "messenger", src: "/support/messenger.png", bg: "", art: LOGO, href: LINKS.messenger },
  { key: "zalo", src: "/support/zalo.png", bg: "", art: LOGO, href: LINKS.zalo },
  { key: "hotline", src: "/support/headphones.svg", bg: BRAND, art: HEADPHONES, href: LINKS.hotline },
];

const ChannelIcon = ({ c, size }: { c: (typeof CHANNELS)[number]; size: number }) => (
  <span className="relative block shrink-0" style={{ width: size, height: size }}>
    {c.bg && <span className="absolute rounded-full" style={{ background: c.bg, ...CIRCLE }} />}
    <Image src={c.src} alt="" width={size} height={size} className="absolute object-contain" style={c.art} />
  </span>
);

const SupportHub = () => {
  const [open, setOpen] = useState(false);
  const t = useTranslations("Support");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="fixed right-4 bottom-4 md:right-6 md:bottom-6 z-50">
      {open ? (
        <div
          className="w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl p-6"
          style={{ boxShadow: SHADOW }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-[17px] font-bold leading-6 text-[#141414]">{t("title")}</h2>
              <p className="text-xs text-[#595959] mt-1">{t("subtitle")}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label={t("close")}
              className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full hover:bg-[#f7f7f7]"
            >
              <Image src="/support/close.svg" alt="" width={12} height={12} />
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {CHANNELS.map((c) => {
              const inner = (
                <>
                  <ChannelIcon c={c} size={44} />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-[#141414] truncate">
                      {t(`${c.key}_name`)}
                    </span>
                    <span className="block text-[11px] text-[#595959] truncate">{t(`${c.key}_desc`)}</span>
                  </span>
                </>
              );
              const cls =
                "flex items-center gap-3 p-2 h-[60px] w-full text-left rounded-lg bg-[#f7f7f7] hover:bg-[#efefef] transition-colors";
              return c.href ? (
                <a key={c.key} href={c.href} target="_blank" rel="noopener noreferrer" className={cls}>
                  {inner}
                </a>
              ) : (
                <button key={c.key} type="button" className={cls}>
                  {inner}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          aria-label={t("open")}
          title={t("open")}
          className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 transition-transform"
          style={{ background: BRAND, boxShadow: SHADOW }}
        >
          <Image src="/support/headphones.svg" alt="" width={24} height={24} />
        </button>
      )}
    </div>
  );
};

export default SupportHub;
