import axios, { type AxiosError } from "axios";

/**
 * Axios instance untuk komponen client.
 * Semua request diarahkan ke layer BFF Next.js (/api/bff), BUKAN langsung ke Express.
 * Cookie HttpOnly otomatis ikut karena same-origin — token tak pernah tersentuh JS.
 */
export const api = axios.create({
  baseURL: "/api/bff",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    // Sesi habis & refresh gagal → arahkan ke login (kecuali sedang di halaman auth).
    if (
      typeof window !== "undefined" &&
      error.response?.status === 401 &&
      !window.location.pathname.startsWith("/login")
    ) {
      const next = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      window.location.href = `/login?next=${next}`;
    }
    return Promise.reject(error);
  },
);

/** Ekstrak pesan error yang ramah dari respons Axios. */
export function getApiErrorMessage(error: unknown, fallback = "Terjadi kesalahan."): string {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string })?.message ?? fallback;
  }
  return fallback;
}
