import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

/** BFF Register: teruskan ke Express. Tidak otomatis login (backend hanya membuat akun). */
export async function POST(req: NextRequest) {
  const body = await req.text();

  const upstream = await fetch(`${env.BACKEND_API_URL}/api/auth/register`, {
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
  return NextResponse.json(data, { status: upstream.status });
}
