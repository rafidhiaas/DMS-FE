import { NextResponse } from "next/server";
import { env } from "@/lib/env";

/** Health check untuk container orchestration (Docker). Cek FE + reachability backend. */
export async function GET() {
  let backend: "up" | "down" = "down";
  try {
    const res = await fetch(`${env.BACKEND_API_URL}/`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) backend = "up";
  } catch {
    backend = "down";
  }

  return NextResponse.json({
    status: "ok",
    service: "dms-fe",
    backend,
    timestamp: new Date().toISOString(),
  });
}
