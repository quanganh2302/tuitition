import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getScope } from "@/lib/scope";

// Proxy chatbot → n8n. Trình duyệt KHÔNG biết URL n8n; route này xác thực Clerk, chặn spam rồi mới chuyển tiếp.
// Env: N8N_CHAT_WEBHOOK_URL (Production URL của Webhook node) + N8N_CHAT_SECRET (so ở header `x-chat-secret`).
const MAX_LEN = 1000;
const LIMIT = 20; // tin / cửa sổ / user
const WINDOW_MS = 10 * 60 * 1000;

// ponytail: rate limit in-memory — đủ cho 1 instance; deploy serverless nhiều instance thì chuyển sang Redis/Upstash.
const hits = new Map<string, number[]>();

export async function POST(req: NextRequest) {
  const { userId, role, orgId } = getScope();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = process.env.N8N_CHAT_WEBHOOK_URL;
  const secret = process.env.N8N_CHAT_SECRET;
  if (!url || !secret) return NextResponse.json({ error: "failed" }, { status: 503 });

  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "failed" }, { status: 400 });
  if (message.length > MAX_LEN) return NextResponse.json({ error: "too_long" }, { status: 400 });

  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  hits.set(userId, [...recent, now]);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-chat-secret": secret },
      // sessionId = userId → n8n Chat Memory tách hội thoại theo người dùng; orgId để lọc tài liệu RAG theo trung tâm.
      body: JSON.stringify({
        message,
        sessionId: userId,
        userId,
        orgId,
        role,
        locale: cookies().get("locale")?.value ?? "vi",
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`n8n ${res.status}`);
    // AI Agent node trả { output }; chấp nhận thêm { reply } nếu tự map ở Respond to Webhook.
    const raw = await res.json();
    const data = Array.isArray(raw) ? raw[0] : raw;
    const reply = data?.output ?? data?.reply;
    if (typeof reply !== "string") throw new Error("n8n: bad payload");
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[chat]", err);
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
