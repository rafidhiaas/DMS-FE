import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { COOKIE } from "@/lib/constants";
import { applyAuthCookies, clearAuthCookies, setUserCookie } from "@/lib/auth/session";
import type { AuthUser } from "@/types";

/**
 * Proxy universal Browser → Express (pola BFF).
 *
 * - Menyuntikkan access token dari cookie HttpOnly sebagai `Authorization: Bearer`.
 * - Jika Express membalas 401, otomatis refresh token (rotation) lalu retry sekali.
 * - Jika refresh gagal, cookie sesi dibersihkan (klien akan diarahkan ke /login).
 *
 * Browser cukup memanggil `/api/bff/<endpoint-express>` tanpa pernah menyentuh token.
 */
async function handler(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const route = path.join("/");
  const search = req.nextUrl.search;
  const targetUrl = `${env.BACKEND_API_URL}/api/${path.join("/")}${search}`;

  const refreshToken = req.cookies.get(COOKIE.refresh)?.value;
  let accessToken = req.cookies.get(COOKIE.access)?.value;

  // Body hanya untuk method yang punya payload.
  const hasBody = !["GET", "HEAD"].includes(req.method);
  let body = hasBody ? await req.arrayBuffer() : undefined;

  // Ganti kata sandi: backend mencabut semua sesi KECUALI refresh token yang dikirim.
  // Cookie-nya HttpOnly (tak terbaca JS), jadi BFF yang menyisipkannya ke body.
  if (route === "auth/change-password" && req.method === "POST" && body && refreshToken) {
    try {
      const json = JSON.parse(Buffer.from(body).toString("utf8")) as Record<string, unknown>;
      const merged = Buffer.from(JSON.stringify({ ...json, refreshToken }), "utf8");
      body = merged.buffer.slice(merged.byteOffset, merged.byteOffset + merged.byteLength) as ArrayBuffer;
    } catch {
      /* body bukan JSON → teruskan apa adanya, backend yang memvalidasi */
    }
  }

  const forward = (token?: string) =>
    fetch(targetUrl, {
      method: req.method,
      headers: {
        "Content-Type": req.headers.get("content-type") ?? "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? Buffer.from(body) : undefined,
      cache: "no-store",
    });

  let upstream = await forward(accessToken);
  let rotated: { accessToken: string; refreshToken: string } | null = null;

  // Access token kedaluwarsa / hilang → coba refresh.
  if (upstream.status === 401 && refreshToken) {
    const refreshRes = await fetch(`${env.BACKEND_API_URL}/api/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    }).catch(() => null);

    if (refreshRes?.ok) {
        const raw = await refreshRes.json();
        const tokens = raw.data ?? raw;
        rotated = {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        };
        accessToken = tokens.accessToken;
        upstream = await forward(accessToken);
      } else {
      const expired = NextResponse.json(
        { message: "Sesi berakhir. Silakan login kembali." },
        { status: 401 },
      );
      clearAuthCookies(expired);
      return expired;
    }
  }

  // Teruskan respons apa adanya (dukung JSON & CSV/biner).
  const payload = await upstream.arrayBuffer();
  const res = new NextResponse(payload, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
      ...(upstream.headers.get("content-disposition")
        ? { "Content-Disposition": upstream.headers.get("content-disposition")! }
        : {}),
    },
  });

  // Jika token dirotasi, perbarui cookie sesi.
  if (rotated) applyAuthCookies(res, rotated);

  // Profil diubah → segarkan cookie identitas yang dibaca Server Components (nama di sidebar).
  if (route === "auth/me" && req.method === "PATCH" && upstream.ok) {
    try {
      const json = JSON.parse(Buffer.from(payload).toString("utf8")) as { data?: AuthUser };
      const u = json.data;
      if (u?.id) setUserCookie(res, { id: u.id, email: u.email, name: u.name, role: u.role });
    } catch {
      /* respons tak terduga → biarkan cookie lama */
    }
  }
  return res;
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
