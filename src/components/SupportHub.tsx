"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// Nút hỗ trợ nổi góc phải-dưới (Figma "Library / Support Channels"): đóng = 1 nút tròn 56px,
// mở = panel 360px chọn kênh. Icon lấy nguyên từ Figma → public/support/*.
// Chatbot mở khung chat trong panel (→ /api/chat → n8n); 2 kênh chat mở link ngoài — điền link thật ở đây.
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

type Msg = { from: "user" | "bot"; text: string };

// Khung chat với trợ lý ảo — gọi /api/chat (route này proxy sang n8n, xem src/app/api/chat/route.ts).
const ChatView = ({ msgs, setMsgs }: { msgs: Msg[]; setMsgs: (fn: (m: Msg[]) => Msg[]) => void }) => {
  const t = useTranslations("Support");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Giữ dấu ngoặc nhọn: Chrome mới cho scrollIntoView trả Promise, React sẽ hiểu nhầm là hàm cleanup.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [msgs, loading]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMsgs((m) => [...m, { from: "user", text }]);
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json().catch(() => ({}));
      const reply = res.ok ? data.reply : t(`chat_error_${data.error ?? "failed"}`);
      setMsgs((m) => [...m, { from: "bot", text: reply }]);
    } catch {
      setMsgs((m) => [...m, { from: "bot", text: t("chat_error_failed") }]);
    } finally {
      setLoading(false);
    }
  };

  const bubble = "max-w-[85%] px-3 py-2 rounded-2xl text-[13px] whitespace-pre-wrap break-words";
  return (
    <>
      <div className="mt-4 h-[320px] max-h-[50vh] overflow-y-auto flex flex-col gap-2">
        {[{ from: "bot" as const, text: t("chat_greeting") }, ...msgs].map((m, i) => (
          <div
            key={i}
            className={
              m.from === "user"
                ? `${bubble} self-end text-[#141414]`
                : `${bubble} self-start bg-[#f7f7f7] text-[#141414]`
            }
            style={m.from === "user" ? { background: BRAND } : undefined}
          >
            {m.text}
          </div>
        ))}
        {loading && <div className={`${bubble} self-start bg-[#f7f7f7] text-[#595959]`}>{t("chat_typing")}</div>}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={1000}
          placeholder={t("chat_placeholder")}
          className="flex-1 min-w-0 h-10 px-3 rounded-lg bg-[#f7f7f7] text-[13px] outline-none focus:ring-2 focus:ring-[#FDDA0D]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="h-10 px-4 rounded-lg text-[13px] font-semibold text-[#141414] disabled:opacity-50"
          style={{ background: BRAND }}
        >
          {t("chat_send")}
        </button>
      </form>
    </>
  );
};

const SupportHub = () => {
  const [open, setOpen] = useState(false);
  const [chat, setChat] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
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
            {chat ? (
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => setChat(false)}
                  aria-label={t("chat_back")}
                  className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full hover:bg-[#f7f7f7] text-[#141414] text-lg"
                >
                  ←
                </button>
                <ChannelIcon c={CHANNELS[0]} size={36} />
                <h2 className="text-[17px] font-bold leading-6 text-[#141414] truncate">{t("chatbot_name")}</h2>
              </div>
            ) : (
              <div>
                <h2 className="text-[17px] font-bold leading-6 text-[#141414]">{t("title")}</h2>
                <p className="text-xs text-[#595959] mt-1">{t("subtitle")}</p>
              </div>
            )}
            <button
              onClick={() => setOpen(false)}
              aria-label={t("close")}
              className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full hover:bg-[#f7f7f7]"
            >
              <Image src="/support/close.svg" alt="" width={12} height={12} />
            </button>
          </div>
          {chat ? (
            <ChatView msgs={msgs} setMsgs={setMsgs} />
          ) : (
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
                <button key={c.key} type="button" onClick={() => setChat(true)} className={cls}>
                  {inner}
                </button>
              );
            })}
          </div>
          )}
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
