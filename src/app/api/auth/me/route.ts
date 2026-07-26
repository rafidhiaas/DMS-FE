import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/session";

/** Mengembalikan user yang sedang login (dari cookie HttpOnly). */
export async function GET() {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ message: "Belum login." }, { status: 401 });
  }
  return NextResponse.json({ user });
}
