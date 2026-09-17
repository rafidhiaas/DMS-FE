import "server-only";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { COOKIE } from "@/lib/constants";
import { env } from "@/lib/env";
import type { AuthUser } from "@/types";

const SEVEN_DAYS = 60 * 60 * 24 * 7;

/** Opsi cookie sesuai NFR: HttpOnly + Secure (prod) + SameSite=Strict (prod). */
const cookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: (env.isProd ? "strict" : "lax") as "strict" | "lax",
  path: "/",
  maxAge: SEVEN_DAYS,
};

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Tulis cookie sesi ke response (dipakai di Route Handlers). */
export function applyAuthCookies(
  res: NextResponse,
  tokens: TokenPair,
  user?: AuthUser,
): void {
  res.cookies.set(COOKIE.access, tokens.accessToken, cookieOptions);
  res.cookies.set(COOKIE.refresh, tokens.refreshToken, cookieOptions);
  if (user) {
    res.cookies.set(COOKIE.user, JSON.stringify(user), cookieOptions);
  }
}

/** Perbarui cookie identitas saja (mis. setelah user mengubah namanya). */
export function setUserCookie(res: NextResponse, user: AuthUser): void {
  res.cookies.set(COOKIE.user, JSON.stringify(user), cookieOptions);
}

/** Hapus seluruh cookie sesi. */
export function clearAuthCookies(res: NextResponse): void {
  for (const name of [COOKIE.access, COOKIE.refresh, COOKIE.user]) {
    res.cookies.set(name, "", { ...cookieOptions, maxAge: 0 });
  }
}

/** Baca user yang login dari cookie (untuk Server Components). */
export async function getServerUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const raw = store.get(COOKIE.user)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

/** Ambil access token dari cookie (untuk fetch server-side ke Express). */
export async function getAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(COOKIE.access)?.value;
}
