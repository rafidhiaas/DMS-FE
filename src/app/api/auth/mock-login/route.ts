import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { applyAuthCookies } from "@/lib/auth/session";
import { MOCK_ACCOUNTS } from "@/lib/mocks/auth";
import type { Role } from "@/types";

/**
 * Login MOCK (khusus mode dev, tanpa backend).
 * Menyetel cookie sesi dengan token dummy + akun demo sesuai peran,
 * sehingga proxy guard & getServerUser bekerja seperti login nyata.
 */
export async function POST(req: NextRequest) {
  if (!env.USE_MOCKS) {
    return NextResponse.json(
      { message: "Mock login dinonaktifkan." },
      { status: 403 },
    );
  }

  const { role } = (await req.json().catch(() => ({}))) as { role?: Role };
  const account = role ? MOCK_ACCOUNTS[role] : undefined;

  if (!account) {
    return NextResponse.json({ message: "Peran tidak valid." }, { status: 400 });
  }

  const res = NextResponse.json({
    message: "Mock login berhasil.",
    user: account,
  });
  applyAuthCookies(
    res,
    {
      accessToken: `mock-access-${role}`,
      refreshToken: `mock-refresh-${role}`,
    },
    account,
  );
  return res;
}
