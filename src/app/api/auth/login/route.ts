import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { applyAuthCookies } from "@/lib/auth/session";

/**
 * BFF Login: menerima kredensial dari browser, menembak Express,
 * lalu menyimpan JWT ke HttpOnly Cookie. Browser tidak pernah melihat token.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();

  const upstream = await fetch(`${env.BACKEND_API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  }).catch(() => null);

  if (!upstream) {
    return NextResponse.json(
      { message: "Tidak dapat terhubung ke server. Coba lagi nanti." },
      { status: 502 },
    );
  }

  const raw = await upstream.json().catch(() => ({}));

  if (!upstream.ok) {
    return NextResponse.json(
      { message: raw.message ?? "Login gagal." },
      { status: upstream.status },
    );
  }

  // Handle wrapped response: { success, data: { user, accessToken, refreshToken } }
  const payload = raw.data ?? raw;

  if (!payload.accessToken || !payload.refreshToken) {
    return NextResponse.json(
      { message: "Respons login tidak valid dari server." },
      { status: 502 },
    );
  }

  const res = NextResponse.json({
    message: raw.message ?? "Login berhasil",
    user: payload.user,
  });

  applyAuthCookies(
    res,
    {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
    },
    payload.user,
  );

  return res;
}