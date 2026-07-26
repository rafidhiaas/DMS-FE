import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, PROTECTED_PREFIXES, AUTH_PAGES } from "@/lib/constants";

/**
 * Edge Auth Guard (dulu bernama Middleware, kini "Proxy" di Next.js 16).
 *
 * Menjaga rute terproteksi berdasarkan keberadaan cookie sesi. Validasi
 * kriptografis token dilakukan di layer BFF (/api/bff) saat memanggil Express.
 * Di sini cukup gerbang cepat tanpa flash/glitch UI.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(COOKIE.refresh)?.value);

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isAuthPage = AUTH_PAGES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  // Belum login tapi mengakses area privat → ke /login (simpan tujuan awal).
  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Sudah login tapi membuka halaman auth → ke dashboard.
  if (isAuthPage && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Jalankan di semua rute kecuali aset statis & endpoint API internal.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
