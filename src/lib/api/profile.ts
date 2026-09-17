import { api } from "@/lib/api/client";
import type { AuthUser } from "@/types";
import { unwrap } from "@/lib/api/_transform";

/**
 * Profil user yang login → backend `PATCH /auth/me` & `POST /auth/change-password`.
 * BFF menyegarkan cookie identitas setelah nama berubah, dan menyisipkan refresh token
 * saat ganti kata sandi agar sesi ini tetap hidup (perangkat lain harus login ulang).
 */

export async function updateProfile(input: { name: string }): Promise<AuthUser> {
  const { data } = await api.patch<unknown>("/auth/me", input);
  return unwrap<AuthUser>(data);
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await api.post("/auth/change-password", input);
}
