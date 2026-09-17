<div align="center">

# 🔐 Secure DMS

### Enterprise Document Management System

Platform manajemen dokumen tingkat enterprise dengan fokus pada **kerahasiaan data**, **struktur hierarkis**, **versioning**, **audit trail immutable**, dan **kepatuhan** (UU PDP, ISO 27001, SOC 2).

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org)
[![Express](https://img.shields.io/badge/Express-5.x-000?logo=express)](https://expressjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748?logo=prisma)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791?logo=postgresql)](https://postgresql.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-ISC-yellow)](#-lisensi)

**[Fitur](#-fitur-utama)** · **[Arsitektur](#-arsitektur)** · **[Quick Start](#-quick-start)** · **[API](#-api-reference)** · **[Deployment](#-deployment)**

</div>

---

## 📖 Tentang Project

**Secure DMS** adalah platform Document Management System (DMS) untuk perusahaan yang memerlukan:

- **Kontrol akses berlapis** — RBAC 4 peran + share per dokumen
- **Keamanan tingkat enterprise** — JWT di HttpOnly Cookie, BFF pattern, enkripsi
- **Ketertelusuran penuh** — setiap aksi tercatat di audit log immutable
- **Pengalaman modern** — setara Paperless-ngx, dengan pencarian cepat, metadata kaya, otomatisasi
- **Skalabilitas** — backend stateless, frontend pakai Server Components

Dibangun sebagai **dua aplikasi terpisah** (BE + FE) yang berkomunikasi lewat **pola BFF** untuk keamanan maksimal.

---

## 🏗 Arsitektur
┌─────────────────────────────────────────────────────────────────────┐
│ USER (Browser) │
│ Desktop 1440px · Mobile 400px │
└──────────────────────────────┬──────────────────────────────────────┘
│ HTTPS
▼
┌─────────────────────────────────────────────────────────────────────┐
│ FRONTEND — Next.js 16 (App Router) │
│ ┌───────────────────────────────────────────────────────────────┐ │
│ │ React Server Components + Client Components │ │
│ │ Tailwind v4 · shadcn/ui · TanStack Query · Axios │ │
│ └───────────────────────────────────────────────────────────────┘ │
│ │
│ ┌───────────────────────────────────────────────────────────────┐ │
│ │ BFF Layer (Route Handlers) │ │
│ │ • /api/auth/login → Set HttpOnly Cookie │ │
│ │ • /api/auth/logout → Revoke + Clear Cookie │ │
│ │ • /api/bff/[...path] → Proxy + Inject Bearer + Auto Refresh │ │
│ └───────────────────────────────────────────────────────────────┘ │
│ │
│ ┌───────────────────────────────────────────────────────────────┐ │
│ │ Edge Middleware (src/proxy.ts) │ │
│ │ • Guard rute privat (redirect jika belum login) │ │
│ └───────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────────────┘
│ HTTP (server-to-server)
▼
┌─────────────────────────────────────────────────────────────────────┐
│ BACKEND — Express 5 (ESM) │
│ ┌───────────────────────────────────────────────────────────────┐ │
│ │ REST API · JWT Auth · RBAC · Zod Validation · Multer │ │
│ └───────────────────────────────────────────────────────────────┘ │
└────────────┬────────────────────┬─────────────────┬─────────────────┘
│ │ │
▼ ▼ ▼
┌───────────┐ ┌──────────────┐ ┌──────────────┐
│PostgreSQL │ │Object Storage│ │ Redis/BullMQ │
│ + Prisma │ │ S3/MinIO/R2 │ │ (Optional) │
└───────────┘ └──────────────┘ └──────────────┘

text

### 🔑 Poin Kunci Arsitektur

| Aspek | Implementasi |
|-------|--------------|
| **Keamanan Token** | JWT hanya di HttpOnly Cookie — **tidak pernah** terekspos ke JS browser |
| **BFF Pattern** | Browser → Next.js → Express, bukan langsung ke BE |
| **Auto Refresh** | Saat 401, BFF otomatis refresh token → retry sekali |
| **Edge Guard** | Route privat dijaga middleware Edge sebelum render |
| **Stateless BE** | Skalabilitas horizontal, tanpa session di memori |
| **Audit Immutable** | Setiap aksi dicatat dengan user, IP, user-agent, timestamp |

---

## ✨ Fitur Utama

### 🔐 Autentikasi & Keamanan

- Login email + password via BFF (JWT di HttpOnly Secure SameSite=Strict)
- Refresh token **rotation** + **reuse detection** (revoke semua token jika token dipakai ulang)
- Rate limiting login: 5× / 15 menit
- Bcrypt password hashing (salt ≥ 10)
- RBAC 4 peran: `SUPER_ADMIN`, `COMPANY_ADMIN`, `AUDITOR`, `EMPLOYEE`
- Multi-tenant (Company) untuk organisasi

### 📂 Manajemen Folder

- Hierarki tak terbatas (self-referencing, unlimited depth)
- Breadcrumb navigation
- Move, rename, delete (cascade sub-folder)
- Folder ownership (owner terpisah dari dokumen)
- Pemilih folder berbentuk pohon (tree picker)

### 📄 Manajemen Dokumen

- Upload multipart (whitelist ekstensi, maks 500 MB)
- **Version control** — setiap upload versi baru menyimpan history lengkap
- **Soft delete → Trash** — restore, purge, empty trash, auto cleanup 30 hari
- Metadata kaya: tag, tipe dokumen, pihak, tanggal dokumen, ASN, custom fields
- Deteksi duplikat via checksum SHA-256
- Pratinjau PDF (pdfjs), gambar, teks/CSV
- Download versi terkini atau versi tertentu

### 🔄 Status Workflow
DRAFT ──────▶ PENDING_REVIEW ──────▶ APPROVED ──────▶ ARCHIVED
▲ │ │
│ │ │
│ ┌──────────┘ │
│ │ REJECT (wajib alasan) │
│ │ │
└────┘ (via WITHDRAW oleh owner) │
│
◀────────────────────┘
UNARCHIVE

text

- Validasi transisi + role-based (owner vs admin)
- Reject wajib alasan
- Prevent bypass via `PATCH /documents/:id`

### 🏷 Metadata (ala Paperless-ngx)

- **Tag** berwarna (many-to-many)
- **Document Type** — klasifikasi dokumen (Invoice, Kontrak, dll)
- **Correspondent** — pihak korespondensi
- **Custom Field** bertipe (text, number, date, boolean, choice, money, url)
- **ASN** (Archive Serial Number) — nomor arsip unik
- **Document Date** — tanggal dokumen (bukan tanggal upload)

### 🤝 Sharing & Kolaborasi

- Share internal per user: `VIEWER`, `DOWNLOADER`, `EDITOR`
- Share link publik berbatas waktu (1/7/30 hari/tanpa batas)
- Hitung berapa kali link dibuka (audit)
- "Shared with me" dari sisi penerima
- Catatan dokumen (notes) dengan komentar

### 📊 Audit Trail & Kepatuhan

- Setiap aksi tercatat: user, action, entity, IP, user-agent, timestamp
- Filter: action, entity, user, date range
- Export CSV (SUPER_ADMIN & AUDITOR)
- Statistik: total, per action, aktivitas 7 hari
- Riwayat per dokumen (tab "Riwayat")

### 🎨 UI/UX Modern

- Desain editorial: serif untuk judul, mono untuk label
- Tema terang/gelap (next-themes)
- Responsif hingga 400 px
- Aksesibilitas WCAG AA (keyboard nav, ARIA, kontras)
- **Keyboard shortcuts**: `?` bantuan, `Ctrl/⌘+K` cari, `g` + huruf navigasi
- Tampilan tersimpan (saved views) — filter + urutan + mode
- Pencarian global lintas folder
- Drag-and-drop upload
- Bulk action (unduh, move, tag, status, hapus)

### 👥 Manajemen Pengguna

- List dengan filter (search, role, include_inactive)
- Create, update (name/role/active), soft delete (deactivate)
- Reset password
- RBAC: `COMPANY_ADMIN` tidak bisa menyentuh `SUPER_ADMIN`
- Prevent self-delete & self-role-change

### ⚙️ Otomatisasi (Workflow Rules)

- Trigger: saat upload / saat status berubah
- Kondisi: folder, format, judul mengandung
- Aksi: tambah tag, set tipe, set pihak, set status awal
- Urutan eksekusi + aktif/nonaktif
- Statistik: jumlah eksekusi & waktu terakhir

---

## 🛠 Tech Stack

### Frontend (`DMS-FE`)

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 16.2 (App Router, Turbopack) |
| UI | React 19 + Tailwind v4 + shadcn/ui (Base UI) |
| Bahasa | TypeScript strict |
| Data | TanStack Query v5 + Axios |
| Form | react-hook-form + Zod |
| Table | TanStack Table |
| PDF | pdfjs-dist |
| Tema | next-themes |
| Toast | Sonner |
| Icons | Lucide |

### Backend (`DMS-BE`)

| Layer | Teknologi |
|-------|-----------|
| Runtime | Node.js 20+ (ES Modules) |
| Framework | Express 5 |
| Bahasa | TypeScript strict |
| ORM | Prisma 7 (`@prisma/adapter-pg`) |
| Database | PostgreSQL 14+ |
| Auth | jsonwebtoken + bcrypt |
| Validation | Zod 4 |
| Upload | Multer |
| Logging | Winston |
| Security | Helmet, CORS |

### Infrastructure (Production-Ready)

| Komponen | Teknologi |
|----------|-----------|
| Object Storage | S3 / MinIO / Cloudflare R2 (presigned URL) |
| Queue / Job | Redis + BullMQ (opsional) |
| OCR Worker | Tesseract (opsional, untuk full-text search) |
| Monitoring | Sentry / OpenTelemetry (opsional) |
| Reverse Proxy | Nginx / Traefik |
| Container | Docker / Docker Compose |

---

## 🚀 Quick Start
