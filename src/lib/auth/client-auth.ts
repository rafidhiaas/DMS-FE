import type { AuthUser } from "@/types";

/** Helper client-side untuk endpoint auth BFF (/api/auth/*), di luar proxy /api/bff. */

interface LoginResult {
  ok: boolean;
  user?: AuthUser;
  message?: string;
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<LoginResult> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, user: data.user, message: data.message };
}

export async function logoutRequest(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
}

export async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch("/api/auth/me", { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return data.user ?? null;
}
