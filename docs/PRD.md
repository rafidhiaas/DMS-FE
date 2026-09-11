# PRD — Secure DMS (Enterprise Document Management System)

| Item | Nilai |
| --- | --- |
| Versi dokumen | 3.0 (merangkum spesifikasi v2.1 + fitur yang sudah dibangun di frontend) |
| Tanggal | 11 September 2026 |
| Status | Frontend selesai fase 1–3 dalam mode mock; menunggu penyelarasan backend |
| Repo frontend | `github.com/defrifegapratama002/DMS-FE` (mirror kolaborasi: `github.com/rafidhiaas/DMS-FE`) |
| Repo backend | `github.com/rafidhiaas/DMS-BE` |
| Acuan visual | Paperless-ngx (demo.paperless-ngx.com), daftar fitur EDMS FormKiQ 2025 |

---

## 1. Ringkasan Eksekutif

Secure DMS adalah platform manajemen dokumen tingkat enterprise untuk menyimpan, mengelola, melacak, dan membagikan aset digital secara aman. Fokusnya: kerahasiaan data, struktur penyimpanan hierarkis, pelacakan versi, jejak audit yang tak bisa diubah, serta kepatuhan (UU PDP, ISO 27001, SOC 2).

Dokumen ini adalah **PRD lengkap** yang menggabungkan:

1. Spesifikasi awal v2.1 (25 Juli 2026) — arsitektur BFF Next.js + Express, RBAC empat peran, folder/dokumen/versi, share internal & eksternal, audit log.
2. Fitur tambahan yang dibangun di frontend berdasarkan benchmark Paperless-ngx — metadata (tag, tipe, pihak, bidang khusus), tampilan tersimpan, alur status, sampah, otomatisasi, pencarian isi, manajemen pengguna, dan pengaturan.

Setiap kebutuhan diberi kode (`FR-xx`) dan **status implementasi** sehingga tim backend tahu apa yang tinggal disambungkan.

### 1.1 Tujuan produk

- **Kerahasiaan & integritas data**: enkripsi at-rest & in-transit, kontrol akses berlapis (RBAC + share per dokumen).
- **Keamanan sisi klien**: token JWT hanya hidup di HttpOnly Secure Cookie melalui lapisan server Next.js (tidak pernah tersentuh JavaScript browser).
- **Ketertelusuran penuh**: setiap aksi pengguna tercatat di audit log yang immutable.
- **Skalabilitas horizontal**: backend stateless; frontend memakai Server Components dan Route Handlers.
- **Produktivitas pengguna**: pengalaman setara EDMS modern (Paperless-ngx) — pencarian cepat, metadata kaya, tampilan tersimpan, otomatisasi.

### 1.2 Pengguna sasaran

| Persona | Kebutuhan utama |
| --- | --- |
| Karyawan (EMPLOYEE) | Mengunggah, mengelola, dan membagikan dokumen miliknya; menemukan dokumen cepat. |
| Admin Perusahaan (COMPANY_ADMIN) | Mengatur struktur folder, meninjau/menyetujui dokumen, mengelola pengguna dan metadata organisasi. |
| Auditor (AUDITOR) | Membaca seluruh dokumen dan audit log untuk pemeriksaan kepatuhan, tanpa mengubah apa pun. |
| Super Admin (SUPER_ADMIN) | Akses global lintas tenant, konfigurasi sistem, audit log global. |

### 1.3 Status implementasi (legenda)

| Kode | Arti |
| --- | --- |
| ✅ FE + BE | Selesai di frontend dan tersambung ke endpoint backend yang ada. |
| 🟡 FE (mock) | Selesai di frontend; berjalan dengan data mock lokal (localStorage / IndexedDB) karena backend belum menyediakan endpoint. Usulan kontrak API tercantum di §7. |
| ⬜ Belum | Belum dibangun. |

---

## 2. Peran Pengguna & Matriks Hak Akses (RBAC)

Peran disinkronkan dengan enum `SystemRole` di skema Prisma.

### 2.1 Definisi peran

- **SUPER_ADMIN** — akses global penuh: seluruh tenant, manajemen pengguna termasuk admin lain, konfigurasi sistem, audit log global.
- **COMPANY_ADMIN** — mengelola folder, dokumen, metadata, otomatisasi, dan pengguna dalam lingkup organisasinya. Tidak dapat menyentuh akun SUPER_ADMIN.
- **AUDITOR** — read-only ke seluruh dokumen dan audit log.
- **EMPLOYEE** — dokumen miliknya sendiri dan yang dibagikan secara eksplisit.

### 2.2 Matriks izin

| Fitur / Aksi | SUPER_ADMIN | COMPANY_ADMIN | AUDITOR | EMPLOYEE |
| --- | --- | --- | --- | --- |
| Kelola pengguna & peran | Penuh | Terbatas (tidak menyentuh SUPER_ADMIN) | ❌ | ❌ |
| Buat / ganti nama / pindah folder | ✅ | ✅ | ❌ | Milik sendiri |
| Hapus folder | ✅ | ✅ | ❌ | ❌ |
| Unggah dokumen & versi baru | ✅ | ✅ | ❌ | Sesuai akses share (EDITOR) |
| Ganti judul / pindah / ubah metadata dokumen | ✅ | ✅ | ❌ | Milik sendiri / EDITOR |
| Bagikan dokumen (internal & tautan publik) | ✅ | ✅ | ❌ | EDITOR only |
| Hapus dokumen (ke Sampah) | ✅ | ✅ | ❌ | ❌ |
| Pulihkan / hapus permanen dari Sampah | ✅ | ✅ | ❌ | ❌ |
| Ajukan review (DRAFT → PENDING_REVIEW) | ✅ | ✅ | ❌ | ✅ |
| Setujui / tolak / arsipkan | ✅ | ✅ | ❌ | ❌ |
| Lihat audit log | Global | Lingkup perusahaan | Global (read-only) | Hanya aksi sendiri |
| Ekspor audit log CSV | ✅ | ❌ | ✅ | ❌ |
| Kelola metadata master (tag, tipe, pihak, bidang khusus) | ✅ | ✅ | ❌ (lihat saja) | ✅ |
| Kelola otomatisasi | ✅ | ✅ | ❌ | ❌ |
| Catatan dokumen | ✅ | ✅ | ❌ | ✅ (hapus milik sendiri) |
| Tampilan tersimpan, pengaturan tampilan | ✅ | ✅ | ✅ | ✅ (lokal per browser) |

Aturan turunan yang diterapkan di UI:

- AUDITOR tidak pernah melihat tombol tulis (unggah, ubah, hapus, bagikan).
- Pengguna tidak dapat menonaktifkan, menghapus, atau mengubah peran akunnya sendiri.
- Pengguna tidak dapat membagikan dokumen ke dirinya sendiri.

---

## 3. Arsitektur Sistem & Tech Stack

```
┌──────────────────────────────────────────────────────────────┐
│ Frontend (Next.js 16 App Router)                             │
│  React Server Components + Client Components (Tailwind v4)   │
│  ────────────────────────────────────────────────────────    │
│  src/proxy.ts (Edge Auth Guard)  +  app/api/* (BFF)          │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTP / REST (Bearer JWT dari cookie)
┌───────────────────────────▼──────────────────────────────────┐
│ Backend (Express, Node.js 20+, ES Modules, TypeScript)       │
│  PostgreSQL + Prisma │ Object Storage S3/MinIO/R2 │ Redis/BullMQ │
└──────────────────────────────────────────────────────────────┘
```

### 3.1 Backend (BE)

- Node.js v20+ (ESM), TypeScript strict, Express (route/controller modular).
- Prisma 7 (`@prisma/adapter-pg`) + PostgreSQL.
- JWT: access token pendek + refresh token rotasi via DB.
- Object Storage S3-compatible via presigned URL (belum diimplementasikan).
- Keamanan: Zod, Helmet, Bcrypt (salt ≥ 10), rate limiting (login maks 5×/15 menit).

### 3.2 Frontend (FE) — yang dibangun

| Aspek | Implementasi |
| --- | --- |
| Framework | Next.js 16.2 App Router, React 19, TypeScript strict |
| Styling | Tailwind CSS v4, shadcn/ui di atas **Base UI** (bukan Radix), Lucide icons, next-themes |
| Data | TanStack Query v5, Axios (`/api/bff/*`), react-hook-form + zod |
| Tabel | TanStack Table (audit log) |
| Auth | Route Handlers `app/api/auth/*` (BFF) menyimpan JWT ke cookie HttpOnly `SameSite=Strict`; `src/proxy.ts` menjaga rute privat; refresh otomatis di proxy BFF saat 401 |
| Lapisan data | `src/lib/api/*` dengan saklar `NEXT_PUBLIC_USE_MOCKS`; mock di `src/lib/mocks/*` (localStorage) dan berkas di IndexedDB |
| Desain | Gaya editorial: serif untuk judul, mono untuk label, tema terang/gelap, responsif hingga 400 px |

### 3.3 Pola BFF

1. Browser → `POST /api/auth/login` (Next.js) → Express `/api/v1/auth/login`.
2. Next.js menyimpan `dms_access`, `dms_refresh`, `dms_user` sebagai cookie HttpOnly.
3. Semua panggilan data lewat `/api/bff/<path>`; BFF menyuntik `Authorization: Bearer` dari cookie, menyegarkan token saat 401, lalu mengulang sekali.
4. `src/proxy.ts` (Edge) mengalihkan ke `/login?next=` bila cookie tidak ada.

Mode demo tanpa database: `POST /api/auth/mock-login` (hanya aktif bila `NEXT_PUBLIC_USE_MOCKS=true`) menyetel cookie akun contoh per peran.

---

## 4. Kebutuhan Fungsional

Format: **kode — judul — status**, diikuti perilaku yang diharapkan dan kriteria penerimaan.

### 4.1 Modul Autentikasi & Keamanan

| Kode | Kebutuhan | Status |
| --- | --- | --- |
| FR-01 | Login email + kata sandi via BFF; JWT disimpan di cookie HttpOnly Secure SameSite=Strict | ✅ FE + BE |
| FR-02 | Refresh token rotasi otomatis saat access token kedaluwarsa | ✅ FE + BE |
| FR-03 | Logout mencabut refresh token dan menghapus cookie | ✅ FE + BE |
| FR-04 | Edge guard: rute `/dashboard, /folders, /documents, /shared, /audit, /users, /trash, /metadata, /settings, /workflows` wajib login; `/login` dialihkan ke dashboard bila sudah login | ✅ FE |
| FR-05 | Health check `GET /api/healthz` (FE) yang juga memeriksa backend | ✅ FE (BE belum punya) |
| FR-06 | Login mock per peran untuk demo tanpa DB | 🟡 FE (mock) |
| FR-07 | Rate limiting login 5×/15 menit | BE (spek) |

Kriteria penerimaan: token tidak pernah terbaca dari `document.cookie`; membuka rute privat tanpa sesi selalu berakhir di `/login` tanpa kedipan UI.

### 4.2 Modul Folder

| Kode | Kebutuhan | Status |
| --- | --- | --- |
| FR-10 | Telusuri folder hierarkis dengan breadcrumb; root hanya berisi folder | ✅ FE + BE |
| FR-11 | Buat, ganti nama, hapus folder (hapus ditolak bila masih berisi dokumen; sub-folder ikut terhapus) | ✅ FE + BE |
| FR-12 | Pindahkan folder ke folder lain / Root; dilarang ke dalam dirinya sendiri atau turunannya | ✅ FE + BE (`PATCH /folders/:id/move`) |
| FR-13 | Pemilih folder berbentuk pohon (untuk pindah & unggah cepat) | 🟡 FE (BE: BFS dari root, usulan `GET /folders/all`) |
| FR-14 | Mode tampilan kartu / tabel, tersimpan per browser | ✅ FE |
| FR-15 | Toolbar: cari di folder, filter status, format, tag, tipe dokumen, pihak, urutan (nama, terbaru, tanggal dokumen, ukuran) | ✅ FE (filter di klien) |
| FR-16 | Seleksi dokumen + bilah aksi massal: unduh, metadata, pindahkan, status, hapus | ✅ FE |
| FR-17 | Drag-and-drop berkas ke halaman folder: 1 berkas membuka dialog, banyak berkas diunggah beruntun | ✅ FE |

### 4.3 Modul Dokumen & Versi

| Kode | Kebutuhan | Status |
| --- | --- | --- |
| FR-20 | Unggah dokumen (judul, format whitelist: pdf, docx, xlsx, pptx, png, jpg, jpeg, txt, csv; maks 500 MB) membuat versi 1 | ✅ FE + BE (metadata) / 🟡 berkas (IndexedDB, menunggu S3 presigned URL) |
| FR-21 | Unggah versi baru dengan catatan perubahan; versi lama tetap tersimpan; status menjadi PENDING_REVIEW | ✅ FE + BE |
| FR-22 | Ganti judul dokumen | ✅ FE + BE |
| FR-23 | Halaman detail split-view: tab Detail / Versi / Konten / Catatan / Riwayat / Akses di kiri, pratinjau di kanan | ✅ FE |
| FR-24 | Pratinjau PDF (iframe), gambar, teks/CSV; tipe lain tombol buka | 🟡 FE (mock IndexedDB; BE: presigned download URL) |
| FR-25 | Unduh versi terkini atau versi tertentu; setiap unduhan tercatat di audit | 🟡 FE (mock) |
| FR-26 | Pindahkan dokumen ke folder lain (tunggal / massal) | 🟡 FE (mock) — usulan `PATCH /documents/:id/move` |
| FR-27 | Deteksi duplikat: checksum SHA-256 per versi; berkas identik memicu konfirmasi (tunggal) atau dilewati dengan peringatan (massal) | 🟡 FE (mock) — BE punya kolom `checksum_sha256` di spek |
| FR-28 | Sampah (soft delete): hapus → Sampah; pulihkan; hapus permanen; kosongkan; pembersihan otomatis setelah 30 hari | 🟡 FE (mock) — usulan `deleted_at` + endpoint sampah |
| FR-29 | Halaman "Semua Dokumen" lintas folder dengan kolom folder, filter rentang tanggal dokumen, dan aksi massal | 🟡 FE (mock; BE: telusur folder) — usulan `GET /documents?all=1` |
| FR-30 | Catatan dokumen (tab Catatan): tambah, hapus milik sendiri/admin, Ctrl+Enter | 🟡 FE (mock) |
| FR-31 | Riwayat dokumen (tab Riwayat): audit log yang terkait dokumen | 🟡 FE (mock) — BE perlu `document_id` di ActivityLog |
| FR-32 | "Mirip dengan ini": saran dokumen dengan tag/tipe/pihak/folder/judul serupa | ✅ FE |
| FR-33 | "Terakhir dibuka": jejak lokal 8 dokumen terakhir di dashboard dan pencarian global | ✅ FE (lokal) |

### 4.4 Modul Metadata (ala Paperless)

| Kode | Kebutuhan | Status |
| --- | --- | --- |
| FR-40 | Tag berwarna (banyak per dokumen); kelola di halaman Metadata; hapus tag melepasnya dari semua dokumen | 🟡 FE (mock) |
| FR-41 | Tipe dokumen dan Pihak (korespondensi), satu per dokumen | 🟡 FE (mock) |
| FR-42 | Atribut dokumen: tanggal dokumen, nomor arsip (ASN, unik), deskripsi | 🟡 FE (mock) |
| FR-43 | Bidang khusus bertipe (teks, angka, tanggal, ya/tidak, pilihan, uang, tautan) dengan nilai per dokumen | 🟡 FE (mock) |
| FR-44 | Dialog "Ubah metadata" di detail; buat tag baru inline | ✅ FE |
| FR-45 | Ubah metadata massal: tambah/lepas tag, set tipe & pihak | 🟡 FE (mock) — usulan `POST /documents/bulk-meta` |
| FR-46 | Chip tag tampil di kartu, tabel, hasil pencarian | ✅ FE |
| FR-47 | Filter berdasarkan tag / tipe / pihak / tanggal di toolbar | ✅ FE (klien) |

### 4.5 Modul Alur Status (Workflow Persetujuan)

| Kode | Kebutuhan | Status |
| --- | --- | --- |
| FR-50 | Status: DRAFT → PENDING_REVIEW → APPROVED → ARCHIVED (dan kembali) | ✅ enum BE / 🟡 transisi FE (mock) |
| FR-51 | Penulis mengajukan review; admin menyetujui, menolak (wajib alasan → catatan + audit), mengarsipkan, membuka arsip; penulis menarik pengajuan | 🟡 FE (mock) — usulan `PATCH /documents/:id/status` |
| FR-52 | Ubah status massal; transisi tak sah dilewati dan dilaporkan | 🟡 FE (mock) |
| FR-53 | Dashboard admin: antrian "Menunggu review" | 🟡 FE (mock) |

Aturan transisi ada di `src/lib/workflow.ts` dan harus direplikasi di backend.

### 4.6 Modul Kolaborasi & Berbagi

| Kode | Kebutuhan | Status |
| --- | --- | --- |
| FR-60 | Share internal per pengguna dengan level VIEWER / DOWNLOADER / EDITOR; upsert; cabut | ✅ FE + BE |
| FR-61 | Halaman "Dibagikan ke Saya"; VIEWER tidak bisa mengunduh | ✅ FE + BE |
| FR-62 | Tab Akses di detail: daftar penerima share + tautan publik | ✅ FE |
| FR-63 | Tautan publik berbatas waktu (1/7/30 hari/tanpa batas), akses VIEWER/DOWNLOADER, hitung pembukaan, cabut | 🟡 FE (mock) — usulan `/shares/documents/:id/links` |
| FR-64 | Halaman publik `/share/[token]` tanpa login: identitas dokumen, pratinjau, unduh sesuai akses; setiap pembukaan tercatat | 🟡 FE (mock) |
| FR-65 | Pemilih pengguna di dialog share hanya menampilkan pengguna aktif | ✅ FE |

### 4.7 Modul Audit Trail & Kepatuhan

| Kode | Kebutuhan | Status |
| --- | --- | --- |
| FR-70 | Setiap aksi penting tercatat: user, action, details, IP, waktu | ✅ BE (aksi inti) / 🟡 aksi FE tambahan |
| FR-71 | Halaman Audit Log (TanStack Table): pagination server, filter action, ekspor CSV untuk SUPER_ADMIN & AUDITOR | ✅ FE + BE |
| FR-72 | Pembatasan: SUPER_ADMIN & AUDITOR global; lainnya hanya aksi sendiri | ✅ FE + BE |
| FR-73 | Dashboard: grafik aktivitas 7 hari, aktivitas terbaru | ✅ FE (mock agregasi) |

Daftar action yang dipakai FE (backend disarankan mengadopsi nama yang sama): LOGIN, LOGIN_FAILED, LOGOUT, CREATE_FOLDER, RENAME_FOLDER, MOVE_FOLDER, DELETE_FOLDER, CREATE_DOCUMENT, RENAME_DOCUMENT, UPLOAD_VERSION, DELETE_DOCUMENT, DOWNLOAD_DOCUMENT, SHARE_DOCUMENT, UPDATE_SHARE_ACCESS, REVOKE_SHARE, CREATE_SHARE_LINK, REVOKE_SHARE_LINK, ACCESS_SHARE_LINK, TRASH_DOCUMENT, RESTORE_DOCUMENT, MOVE_DOCUMENT, ADD_NOTE, DELETE_NOTE, UPDATE_DOCUMENT_META, CREATE_META, UPDATE_META, DELETE_META, SUBMIT_REVIEW, WITHDRAW_REVIEW, APPROVE_DOCUMENT, REJECT_DOCUMENT, ARCHIVE_DOCUMENT, UNARCHIVE_DOCUMENT, CREATE_USER, UPDATE_USER, DEACTIVATE_USER, ACTIVATE_USER, DELETE_USER, WORKFLOW_APPLIED, UPDATE_WORKFLOW.

### 4.8 Modul Pencarian

| Kode | Kebutuhan | Status |
| --- | --- | --- |
| FR-80 | Pencarian global (Ctrl/⌘+K): folder + dokumen, hasil terkelompok, navigasi keyboard | 🟡 FE (mock) — usulan `GET /search?q=` |
| FR-81 | Pencocokan judul, ekstensi, deskripsi, nama tag/tipe/pihak, ASN | 🟡 FE (mock) |
| FR-82 | Pencarian isi berkas teks (txt, csv, md, json) dengan cuplikan; tab Konten dengan sorotan | 🟡 FE (mock, ekstraksi di browser) — BE: OCR/full-text untuk PDF & gambar |
| FR-83 | Kotak pencarian kosong menampilkan "Terakhir dibuka" | ✅ FE |

### 4.9 Modul Dashboard & Tampilan Tersimpan

| Kode | Kebutuhan | Status |
| --- | --- | --- |
| FR-90 | Dashboard role-aware: sapaan, aksi cepat, 4 angka ringkasan, status dokumen, aktivitas 7 hari, antrian review / dokumen terbaru, terakhir dibuka, aktivitas terbaru | ✅ FE (agregasi mock; BE butuh endpoint statistik) |
| FR-91 | Distribusi "Tag terbanyak" dan "Tipe dokumen" | 🟡 FE (mock) |
| FR-92 | Unggah cepat dari dashboard: tombol atau drop di mana saja → pilih folder → unggah beruntun | ✅ FE |
| FR-93 | Tampilan Tersimpan: simpan filter+urutan+mode tampilan folder atau Semua Dokumen dengan nama; tampil di sidebar dan sebagai panel dashboard | ✅ FE (lokal per browser) |
| FR-94 | Kelola tampilan tersimpan di Pengaturan (ganti nama, toggle sidebar/dashboard, hapus) | ✅ FE |

### 4.10 Modul Otomatisasi

| Kode | Kebutuhan | Status |
| --- | --- | --- |
| FR-100 | Aturan berurutan: pemicu (saat unggah / saat status berubah [opsional status tertentu]), kondisi (folder, format, judul mengandung), aksi (tambah tag, set tipe, set pihak, status awal saat unggah) | 🟡 FE (mock) — usulan `/workflows` |
| FR-101 | Aktif/nonaktif, ubah urutan, jumlah eksekusi & waktu terakhir, audit WORKFLOW_APPLIED | 🟡 FE (mock) |
| FR-102 | Aturan contoh: "Tandai unggahan baru" (tag Baru), "Kontrak di folder Legal" (PDF/DOCX → tag Kontrak, tipe Kontrak) | 🟡 FE (mock) |

### 4.11 Modul Manajemen Pengguna

| Kode | Kebutuhan | Status |
| --- | --- | --- |
| FR-110 | Daftar pengguna: nama, email, peran, status aktif, login terakhir, dibuat; cari; tampilkan nonaktif | 🟡 FE (mock) — usulan `GET /users` |
| FR-111 | Tambah pengguna (nama, email, peran) | 🟡 FE (mock) — BE punya `/auth/register` |
| FR-112 | Ubah nama/peran; nonaktifkan/aktifkan; hapus | 🟡 FE (mock) — usulan `PATCH/DELETE /users/:id` |
| FR-113 | Aturan RBAC: COMPANY_ADMIN tidak menyentuh SUPER_ADMIN; tidak bisa mengubah/menonaktifkan/menghapus diri sendiri | ✅ FE (harus divalidasi ulang di BE) |

### 4.12 Modul Pengaturan & Pengalaman Pengguna

| Kode | Kebutuhan | Status |
| --- | --- | --- |
| FR-120 | Halaman Pengaturan: profil (read-only), tema (terang/gelap/sistem), mode daftar default, sidebar penuh/ramping | ✅ FE |
| FR-121 | Reset data contoh (mode mock) | ✅ FE |
| FR-122 | Sidebar ramping (ikon saja) | ✅ FE |
| FR-123 | Pintasan keyboard: `?` bantuan, Ctrl+K cari, `g` lalu huruf untuk navigasi, Ctrl+Enter kirim catatan | ✅ FE |
| FR-124 | Navigasi mobile (sheet), tema gelap, responsif 400 px | ✅ FE |
| FR-125 | Pesan error API dinormalisasi ke bahasa pengguna | ✅ FE |

---

## 5. Model Data

### 5.1 Skema backend (Prisma, sesuai spek v2.1)

`User`, `RefreshToken`, `Folder` (hierarki self-relation), `Document`, `DocumentVersion` (`file_path`, `file_size`, `mime_type`, `checksum_sha256`), `DocumentShare` (`access_level`: VIEWER/DOWNLOADER/EDITOR), `ActivityLog` (`user_id`, `action`, `details`, `ip_address`, `created_at`).

### 5.2 Perluasan yang dibutuhkan fitur FE (usulan migrasi)

| Entitas | Kolom / tabel baru | Dipakai oleh |
| --- | --- | --- |
| `Document` | `status` (DRAFT/PENDING_REVIEW/APPROVED/ARCHIVED — sudah ada), `deleted_at?`, `document_type_id?`, `correspondent_id?`, `document_date?`, `asn?` (unik), `description?`, `custom_fields` (JSON) | Sampah, metadata, alur status |
| `DocumentTag` (pivot) + `Tag` (`name`, `color`) | — | Tag |
| `DocumentType`, `Correspondent` | `name` unik | Metadata |
| `CustomField` | `name`, `type`, `options` (JSON) | Bidang khusus |
| `DocumentNote` | `document_id`, `user_id`, `body`, `created_at` | Catatan |
| `ShareLink` | `document_id`, `token` unik, `access`, `expires_at?`, `created_by`, `access_count` | Tautan publik |
| `ActivityLog` | `document_id?` | Riwayat per dokumen |
| `User` | `active` (bool), `last_login_at?` | Manajemen pengguna |
| `WorkflowRule` | lihat `WorkflowRuleInput` di `src/types/index.ts` | Otomatisasi |
| `DocumentContent` | `document_id`, `text` (hasil OCR/ekstraksi) | Pencarian isi |

Tipe TypeScript acuan untuk semua entitas ada di `src/types/index.ts`.

---

## 6. Kontrak API yang Sudah Ada (Express)

Basis `http://localhost:5000/api`, semua butuh `Authorization: Bearer <access>` kecuali auth.

| Method | Path | Catatan |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` | Login mengembalikan `{ accessToken, refreshToken, user }` |
| POST | `/folders` | `{ name, parent_folder_id }` |
| GET | `/folders/:id` (`root` untuk akar) | `{ folderId, subFolders, documents }` |
| PATCH | `/folders/:id/rename`, `/folders/:id/move` | `{ name }`, `{ new_parent_folder_id }` |
| DELETE | `/folders/:id` | Ditolak bila berisi dokumen |
| POST | `/documents` | `{ title, extension, size_bytes, folder_id }` → `s3_file_key` placeholder |
| GET | `/documents/:id`, `/documents/:id/versions` | Detail + versi |
| PATCH | `/documents/:id/rename` | `{ title }` |
| POST | `/documents/:id/versions` | `{ size_bytes, changelog, extension }` |
| DELETE | `/documents/:id` | Permanen (SUPER_ADMIN, COMPANY_ADMIN) |
| GET | `/shares/shared-with-me` | `{ shares: [...] }` |
| GET/POST | `/shares/documents/:id/share` | Daftar / buat share `{ user_id, access_level }` |
| PATCH/DELETE | `/shares/:shareId` | Ubah level / cabut |
| GET | `/activity-logs?page&limit&action`, `/activity-logs/export` | Paginated / CSV |

---

## 7. Kontrak API yang Diusulkan (untuk fitur FE mode mock)

Bentuk respons mengikuti pola yang sudah ada (`{ item }`, `{ items }`, `{ document }`). Implementasi FE tinggal mengubah `NEXT_PUBLIC_USE_MOCKS=false` bila endpoint tersedia dengan bentuk ini.

| Fitur | Endpoint |
| --- | --- |
| Berkas | `POST /documents/:id/upload-url` → presigned PUT; `GET /documents/:id/versions/:n/download-url` → presigned GET; pratinjau memakai URL yang sama |
| Sampah | `GET /documents/trash`, `POST /documents/:id/restore`, `DELETE /documents/:id/purge`, `DELETE /documents/trash` |
| Pindah dokumen | `PATCH /documents/:id/move { folder_id }` |
| Semua dokumen | `GET /documents?all=1` (atau `/documents` dengan filter query) |
| Status | `PATCH /documents/:id/status { status, note? }` — validasi transisi sesuai `lib/workflow.ts` |
| Metadata dokumen | `PATCH /documents/:id/meta { tag_ids, document_type_id, correspondent_id, document_date, asn, description, custom_fields }`; `POST /documents/bulk-meta { ids, add_tag_ids, remove_tag_ids, document_type_id?, correspondent_id? }` |
| Master metadata | `GET/POST /tags`, `PATCH/DELETE /tags/:id` (juga `/document-types`, `/correspondents`, `/custom-fields`) → `{ items }` / `{ item }` |
| Catatan | `GET/POST /documents/:id/notes`, `DELETE /documents/notes/:noteId` |
| Riwayat dokumen | `GET /activity-logs?document_id=` (butuh kolom `document_id`) |
| Tautan publik | `GET/POST /shares/documents/:id/links`, `DELETE /shares/links/:id`, `GET /public/share/:token` (tanpa auth) |
| Pencarian | `GET /search?q=&limit=` → `{ results: SearchResult[] }` (folder & dokumen, opsional `snippet`) |
| Statistik | `GET /stats` → `{ folders, documents, totalBytes, byStatus, byTag, byType }`; `GET /documents?status=PENDING_REVIEW&limit=5` |
| Pengguna | `GET /users?q&include_inactive`, `POST /users`, `PATCH /users/:id { name?, role?, active? }`, `DELETE /users/:id` |
| Otomatisasi | `GET/POST /workflows`, `PATCH/DELETE /workflows/:id`, `POST /workflows/:id/move { direction }`; evaluasi aturan di server saat unggah & ubah status |
| Semua folder | `GET /folders/all` (menggantikan BFS di klien) |
| Health | `GET /healthz` |

---

## 8. Kebutuhan Non-Fungsional

| Area | Target |
| --- | --- |
| Performa | LCP halaman Next.js < 1,2 detik; respons API < 200 ms; daftar audit ribuan baris tanpa lag (pagination server) |
| Keamanan | Bebas OWASP Top 10; cookie HttpOnly + Secure + SameSite=Strict; token tidak pernah di localStorage; validasi input Zod di BE; validasi RBAC di BE untuk setiap aksi yang UI sembunyikan |
| Observabilitas | `/api/healthz` di Next.js dan Express untuk orkestrasi container |
| Aksesibilitas | Navigasi keyboard penuh (dialog, menu, pintasan), label ARIA pada tombol ikon, kontras memenuhi WCAG AA di tema terang & gelap |
| Responsif | Bekerja di lebar 400 px (nav sheet, tabel bergulir horizontal) |
| Internasionalisasi | Antarmuka Bahasa Indonesia; format tanggal/angka `id-ID` |
| Kualitas kode | TypeScript strict, ESLint (termasuk aturan React Compiler) bersih; setiap fitur diuji di browser sebelum commit |
| Data lokal (mode demo) | Semua data mock di localStorage/IndexedDB browser; tombol reset tersedia di Pengaturan |

---

## 9. Prinsip Desain & UX

1. **Satu bahasa visual**: `PageHeader` di setiap halaman, `EmptyState` tenang (satu kalimat, satu aksi), warna berbasis token (tidak ada warna Tailwind mentah kecuali ikon folder).
2. **Aman secara default**: aksi destruktif selalu lewat dialog konfirmasi; hapus berarti ke Sampah, bukan permanen.
3. **Jujur soal batas**: fitur yang menunggu backend menampilkan teks fallback yang menjelaskan alasannya, bukan gagal diam-diam.
4. **Cepat untuk pengguna berat**: pintasan keyboard, pencarian global, tampilan tersimpan, aksi massal, drag-and-drop.
5. **Konteks selalu terlihat**: breadcrumb, chip tag di daftar, nama folder di daftar lintas folder, status di setiap kartu.

---

## 10. Di Luar Cakupan (saat ini)

- OCR dan pencarian teks penuh untuk PDF/gambar (butuh layanan server, mis. Tesseract di worker BullMQ).
- Aturan email otomatis (mail rules) dan konsumsi dokumen dari mailbox.
- Kolaborasi real-time (co-editing), komentar bertingkat.
- Enkripsi sisi klien; penandatanganan digital.
- Multi-tenant UI (pemisahan organisasi di antarmuka) — backend menyediakan lingkup, UI mengikuti.
- Aplikasi mobile native.

---

## 11. Peta Jalan

| Fase | Isi | Status |
| --- | --- | --- |
| 1. Fondasi | Scaffold Next.js 16, BFF auth, proxy guard, shell UI | Selesai (Juli 2026) |
| 2. Inti | Folder, dokumen, versi, share, audit, dashboard, pengguna (read-only), mobile nav | Selesai (Sep 2026) |
| 3. Paperless sweep | Daftar ala Paperless, tautan publik, pencarian global, detail split-view, sampah, pindah, catatan, pratinjau, tampilan tersimpan, unggah cepat, sidebar ramping, pintasan, metadata, semua dokumen, alur status, bidang khusus, manajemen pengguna, pengaturan, pencarian isi, duplikat, mirip, otomatisasi | Selesai (11 Sep 2026, mode mock) |
| 4. Penyelarasan backend | Implementasi endpoint §7, migrasi §5.2, S3 presigned URL, OCR worker; matikan `NEXT_PUBLIC_USE_MOCKS` | Berikutnya |
| 5. Pengerasan produksi | Uji beban, uji keamanan (OWASP), monitoring, CI/CD, dokumentasi operasional | Setelah fase 4 |

---

## 12. Kriteria Penerimaan Rilis (Definition of Done per fitur)

1. Tersedia untuk peran yang berhak dan tersembunyi/ditolak untuk yang tidak (diuji per peran).
2. Setiap mutasi menghasilkan entri audit dengan action yang terdaftar di §4.7.
3. Lolos `tsc --noEmit` dan `eslint` tanpa error.
4. Diuji di browser desktop (1440 px) dan mobile (400 px), tema terang dan gelap.
5. Keadaan kosong, memuat, dan gagal ditangani dengan komponen standar.
6. Bila backend belum siap: lapisan `src/lib/api/*` sudah memuat panggilan endpoint yang diusulkan sehingga peralihan hanya mengubah satu variabel lingkungan.

---

## 13. Glosarium

| Istilah | Arti |
| --- | --- |
| BFF | Backend-for-Frontend: Route Handler Next.js yang menjadi perantara browser dan Express, menyimpan token di cookie. |
| ASN | Archive Serial Number — nomor arsip unik per dokumen. |
| Pihak | Korespondensi (correspondent) — lawan/asal dokumen, mis. vendor atau instansi. |
| Tampilan Tersimpan | Saved view — kombinasi filter, urutan, dan mode tampilan yang diberi nama. |
| Presigned URL | URL sementara dari Object Storage untuk unggah/unduh langsung dari browser. |
| Mock | Implementasi lokal (localStorage/IndexedDB) yang meniru perilaku backend sampai endpoint tersedia. |
