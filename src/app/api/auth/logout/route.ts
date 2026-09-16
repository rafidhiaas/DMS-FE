import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { COOKIE } from "@/lib/constants";
import { clearAuthCookies } from "@/lib/auth/session";

/** BFF Logout: cabut refresh token di backend lalu bersihkan cookie sesi. */
export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(COOKIE.refresh)?.value;
  const accessToken = req.cookies.get(COOKIE.access)?.value;

  if (refreshToken) {
    await fetch(`${env.BACKEND_API_URL}/api/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    }).catch(() => {
      /* logout tetap dianggap sukses dari sisi klien */
    });
  }

  const res = NextResponse.json({ message: "Logout berhasil." });
  clearAuthCookies(res);
  return res;
}