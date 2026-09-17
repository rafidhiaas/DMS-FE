# Secure DMS — Frontend

Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn/ui (Base UI) + TanStack Query.
Frontend **tidak punya data mock** — semua data berasal dari backend Express
([DMS-BE](https://github.com/rafidhiaas/DMS-BE)) lewat pola **BFF**.

```
Browser ──► Next.js /api/bff/*  ──►  Express /api/*  ──►  PostgreSQL
            (cookie HttpOnly,        (JWT Bearer)
             auto-refresh token)
```

Token tidak pernah menyentuh JavaScript browser: login menyimpan `dms_access` / `dms_refresh`
sebagai cookie HttpOnly, dan `/api/bff/[...path]` menyuntikkan `Authorization: Bearer` ke Express
(termasuk unggah multipart dan unduh berkas biner).

## Menjalankan

Butuh backend + PostgreSQL aktif (lihat README DMS-BE).

> **Versi backend:** frontend ini memakai endpoint yang (per 17 Sep 2026) baru ada di branch
> [`feat/fe-integration` pada fork defrifegapratama002/DMS-BE](https://github.com/defrifegapratama002/DMS-BE/tree/feat/fe-integration)
> — berkas/pratinjau, catatan, tautan publik, pencarian isi berkas, otomatisasi, bidang khusus, statistik, profil.
> Dengan `main` upstream (rafidhiaas/DMS-BE) sebagian besar halaman akan gagal sampai branch itu di-merge.

```bash
cp .env.example .env.local     # BACKEND_API_URL=http://localhost:5000
npm install
npm run dev                    # http://localhost:3000
```

> Windows PowerShell dengan ExecutionPolicy default: pakai `npm.cmd run dev`.

Akun demo (dibuat `npm run seed` di backend, password `Password123!`):
`super@dms.test`, `admin@dms.test`, `auditor@dms.test`, `karyawan@dms.test`.
Saat development, halaman login menampilkan daftar ini — klik untuk mengisi form.

## Struktur data layer

| Lokasi | Isi |
|---|---|
| `src/app/api/auth/*` | login / logout / register / me — mengelola cookie sesi |
| `src/app/api/bff/[...path]` | proxy universal ke Express + refresh token otomatis |
| `src/lib/api/_transform.ts` | adapter respons BE (camelCase, `{success,data}`) → tipe FE (snake_case) |
| `src/lib/api/*.ts` | satu file per modul: profile, documents, folders, shares, share-links, notes, meta, custom-fields, workflows, search, stats, users, activity-logs, files |
| `src/hooks/use-*.ts` | hook TanStack Query di atas `lib/api` |
| `src/lib/domain.ts` | konstanta domain (retensi Sampah, palet tag, `DuplicateDocumentError`) |

Yang sengaja tetap di browser (preferensi per-perangkat, bukan data bisnis): tema, mode tampilan
folder, sidebar ramping, tampilan tersimpan, “terakhir dibuka”, dan cache thumbnail (IndexedDB).

## Pemeriksaan

```bash
npx tsc --noEmit
npm run lint
```

Jangan jalankan `next build` saat `next dev` masih hidup — keduanya berbagi `.next` dan cache dev rusak
(semua rute 404). Bila terjadi: hentikan dev server, hapus `.next`, jalankan ulang.
