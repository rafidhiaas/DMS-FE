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

  const data = await upstream.json().catch(() => ({}));

  if (!upstream.ok) {
    return NextResponse.json(
      { message: data.message ?? "Login gagal." },
      { status: upstream.status },
    );
  }

  const res = NextResponse.json({ message: data.message, user: data.user });
  applyAuthCookies(
    res,
    { accessToken: data.accessToken, refreshToken: data.refreshToken },
    data.user,
  );
  return res;
}
