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
    // Normalisasi: teruskan pesan asli backend ({ message }) sebagai Error biasa,
    // sehingga `e.message` di onError hooks/komponen selalu ramah pengguna —
    // bukan "Request failed with status code 400" bawaan Axios.
    // code + data ikut dibawa untuk error yang perlu ditangani khusus (mis. DUPLICATE_DOCUMENT).
    const body = error.response?.data as { code?: string; data?: unknown } | undefined;
    return Promise.reject(
      Object.assign(new Error(getApiErrorMessage(error)), {
        status: error.response?.status,
        code: body?.code,
        data: body?.data,
      }),
    );
  },
);

/** Error hasil normalisasi interceptor di atas. */
export type ApiError = Error & { status?: number; code?: string; data?: unknown };

/** Ekstrak pesan error yang ramah dari error Axios maupun Error biasa. */
export function getApiErrorMessage(error: unknown, fallback = "Terjadi kesalahan."): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string })?.message;
    if (message) return message;
    if (!error.response) return "Tidak dapat terhubung ke server. Periksa koneksi Anda.";
    return fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
