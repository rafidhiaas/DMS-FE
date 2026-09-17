# DMS Backend — Secure Document Management System

Backend API untuk **Secure DMS** (Enterprise Document Management System) — platform manajemen dokumen tingkat enterprise dengan fokus pada kerahasiaan data, hierarki folder, versioning, audit trail, dan kepatuhan (UU PDP, ISO 27001, SOC 2).

Dibangun dengan **Express 5 + Prisma 7 + PostgreSQL + TypeScript** (ES Modules, strict mode).

---

## ✨ Fitur Utama

### 🔐 Autentikasi & Keamanan
- JWT access token (15m) + refresh token (7d) dengan **rotation & reuse detection**
- Cookie HttpOnly via BFF Next.js (token tidak pernah tersentuh JS browser)
- Bcrypt password hashing (salt ≥ 10)
- Role-Based Access Control (RBAC): `SUPER_ADMIN`, `COMPANY_ADMIN`, `AUDITOR`, `EMPLOYEE`

### 📂 Manajemen Folder
- Hierarki tak terbatas (self-referencing)
- Breadcrumb, move, rename, delete (cascade)
- Pemilik folder terpisah dari pemilik dokumen

### 📄 Manajemen Dokumen
- Upload multipart (metadata + file)
- **Version control** — setiap upload versi baru menyimpan history
- **Soft delete** + Trash (restore, purge, empty trash)
- Metadata: tag, document type, correspondent, ASN, tanggal dokumen, custom fields
- Pencarian: title, description, status, folder

### 🔄 Status Workflow
