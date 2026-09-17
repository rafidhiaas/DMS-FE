# Pengujian Secure DMS

Tidak ada mock: semua uji berjalan terhadap **aplikasi yang sedang hidup**
(Browser/Node → Next.js BFF → Express → PostgreSQL). Tanpa dependensi tambahan — cukup Node 22+
dan Chrome/Edge terpasang (untuk uji yang membuka browser).

## 1. Nyalakan aplikasinya

| Layanan | Perintah | Port |
|---|---|---|
| PostgreSQL | milik masing-masing (lihat README DMS-BE) | 5432 |
| Backend | `npm run db:migrate && npm run seed && npm run dev` di `DMS-BE` | 5000 |
| Frontend | `npm run dev` di `dms-fe` | 3000 |

`npm run seed` wajib — uji memakai akun demo (password `Password123!`):
`super@dms.test`, `admin@dms.test`, `auditor@dms.test`, `karyawan@dms.test`.

## 2. Uji otomatis

Di `dms-fe` (Windows PowerShell: pakai `npm.cmd`):

| Perintah | Isi | Cek |
|---|---|---|
| `npm run test:checklist` | **Checklist QA di bawah, butir per butir** — navigasi di browser sungguhan + CRUD, sharing, workflow, users | 33 |
| `npm run test:session` | cookie HttpOnly, refresh token otomatis & rotasi, tautan publik, proteksi rute | 18 |
| `npm run test:features` | deteksi duplikat, pencarian isi PDF, otomatisasi, catatan, profil & ganti sandi | 17 |
| `npm run test:roles` | 4 peran di browser: halaman yang boleh/terlarang + aturan backend yang tak bisa dilewati | 46 |
| `npm test` | semuanya berurutan | 114 |

Di `DMS-BE`: `npm run test:api` — 47 cek endpoint langsung ke Express (tanpa frontend).

Keluaran `test:checklist` berbentuk checklist yang sama (`[x]` lolos, `[ ]` gagal + penyebabnya).
Bila sebuah halaman gagal, screenshot-nya disimpan di `tests/.shots/`.

Hal yang perlu diketahui:

- **Data uji dibersihkan sendiri.** Tiap uji membuat folder/dokumen bernama `Uji …` lalu menghapusnya
  permanen. Satu pengecualian: user `uji-checklist-*@dms.test` hanya bisa dinonaktifkan lewat API —
  `npm run seed` di backend menghapus sisa-sisanya.
- **Uji memakai database development Anda**, bukan database terpisah. Data Anda tidak disentuh, tetapi
  audit log akan berisi aktivitas uji.
- **Sesi bisa ter-logout.** `test:session` sengaja memicu deteksi pencurian token pada akun *auditor*, dan
  `test:features` mengganti (lalu mengembalikan) sandi akun *karyawan* — browser yang sedang login dengan
  dua akun itu harus login ulang. Akun admin tidak terpengaruh.
- Variabel opsional: `FE_URL` (default `http://localhost:3000`), `BACKEND_URL`, `CHROME_PATH`,
  `DEMO_PASSWORD`; di backend `API_ORIGIN`.

Pemeriksaan statis (tanpa aplikasi hidup): `npx tsc --noEmit` dan `npm run lint` di kedua repo.

## 3. Checklist QA (manual)

Dipakai saat uji manual sebelum rilis; versi otomatisnya = `npm run test:checklist`.
Login sebagai `admin@dms.test` kecuali disebut lain.

Navigation:
- [ ] /dashboard — statistik + aktivitas
- [ ] /folders — list folder
- [ ] /folders/[id] — isi folder + dokumen
- [ ] /documents — semua dokumen
- [ ] /documents/[id] — detail dokumen
- [ ] /shared — dibagikan ke saya
- [ ] /audit — activity log
- [ ] /trash — sampah
- [ ] /users — user management (admin)
- [ ] /metadata — tag, type, correspondent
- [ ] /settings — pengaturan

CRUD:
- [ ] Upload dokumen baru
- [ ] Buat folder baru
- [ ] Rename folder
- [ ] Rename dokumen
- [ ] Upload versi baru
- [ ] Edit metadata dokumen
- [ ] Hapus dokumen (soft → trash)
- [ ] Restore dari trash
- [ ] Purge permanen

Sharing:
- [ ] Share dokumen ke user lain
- [ ] Update access level
- [ ] Revoke share
- [ ] Cek "Dibagikan ke Saya" (login sebagai `karyawan@dms.test`)

Workflow:
- [ ] Submit review (DRAFT → PENDING_REVIEW)
- [ ] Approve (PENDING_REVIEW → APPROVED)
- [ ] Archive
- [ ] Reject dengan alasan (alasan wajib; muncul di tab Catatan)

Users (ubah peran & hapus: login sebagai `super@dms.test`):
- [ ] Create user
- [ ] Update user
- [ ] Deactivate user (user tersebut tidak bisa login lagi)
- [ ] Reset password

Yang **tidak** tercakup uji otomatis dan perlu mata manusia: tampilan/tata letak (terang & gelap, mobile),
drag-and-drop unggah, thumbnail & pratinjau PDF/gambar, dialog konfirmasi, toast, pintasan keyboard.
