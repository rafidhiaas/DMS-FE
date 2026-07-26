/**
 * Konfigurasi environment terpusat.
 * BACKEND_API_URL sengaja TANPA prefix NEXT_PUBLIC agar tetap server-only
 * (browser tidak pernah tahu alamat Express — inti dari pola BFF).
 */
export const env = {
  /** Base URL Express API. Hanya dipakai di sisi server (Route Handlers / Server Components). */
  BACKEND_API_URL: process.env.BACKEND_API_URL ?? "http://localhost:5000",
  /** Pakai data mock untuk fitur yang belum didukung backend. */
  USE_MOCKS: process.env.NEXT_PUBLIC_USE_MOCKS === "true",
  /** True saat build produksi. */
  isProd: process.env.NODE_ENV === "production",
} as const;
