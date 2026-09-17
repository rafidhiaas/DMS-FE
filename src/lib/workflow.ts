import type { DocumentStatus, Role } from "@/types";

/**
 * Alur status dokumen (DRAFT → PENDING_REVIEW → APPROVED → ARCHIVED) dan siapa
 * yang boleh memindahkannya. Dipakai UI untuk menampilkan aksi yang relevan;
 * backend (`PATCH /documents/:id/status`, lib/workflow.ts) menegakkan aturan yang sama.
 */

export type WorkflowIntent = "primary" | "outline" | "destructive";

export interface WorkflowAction {
  /** Status tujuan. */
  to: DocumentStatus;
  label: string;
  intent: WorkflowIntent;
  /** Aksi audit yang dicatat. */
  audit: string;
  /** Minta alasan (mis. tolak). */
  requiresNote?: boolean;
  /** Pesan sukses. */
  toast: string;
}

const ADMIN: Role[] = ["SUPER_ADMIN", "COMPANY_ADMIN"];
const WRITERS: Role[] = ["SUPER_ADMIN", "COMPANY_ADMIN", "EMPLOYEE"];

const RULES: Array<{ from: DocumentStatus; roles: Role[]; action: WorkflowAction }> = [
  {
    from: "DRAFT",
    roles: WRITERS,
    action: { to: "PENDING_REVIEW", label: "Ajukan review", intent: "primary", audit: "SUBMIT_REVIEW", toast: "Dokumen diajukan untuk review." },
  },
  {
    from: "PENDING_REVIEW",
    roles: ADMIN,
    action: { to: "APPROVED", label: "Setujui", intent: "primary", audit: "APPROVE_DOCUMENT", toast: "Dokumen disetujui." },
  },
  {
    from: "PENDING_REVIEW",
    roles: ADMIN,
    action: { to: "DRAFT", label: "Tolak", intent: "destructive", audit: "REJECT_DOCUMENT", requiresNote: true, toast: "Dokumen dikembalikan ke draft." },
  },
  {
    from: "PENDING_REVIEW",
    roles: WRITERS,
    action: { to: "DRAFT", label: "Tarik pengajuan", intent: "outline", audit: "WITHDRAW_REVIEW", toast: "Pengajuan review ditarik." },
  },
  {
    from: "APPROVED",
    roles: ADMIN,
    action: { to: "ARCHIVED", label: "Arsipkan", intent: "outline", audit: "ARCHIVE_DOCUMENT", toast: "Dokumen diarsipkan." },
  },
  {
    from: "ARCHIVED",
    roles: ADMIN,
    action: { to: "APPROVED", label: "Buka arsip", intent: "outline", audit: "UNARCHIVE_DOCUMENT", toast: "Dokumen dikeluarkan dari arsip." },
  },
];

/** Aksi yang tersedia untuk peran tertentu pada status saat ini. */
export function workflowActions(status: DocumentStatus, role: Role): WorkflowAction[] {
  const out: WorkflowAction[] = [];
  for (const r of RULES) {
    if (r.from !== status || !r.roles.includes(role)) continue;
    // "Tarik pengajuan" hanya untuk yang bukan admin (admin sudah punya Tolak).
    if (r.action.audit === "WITHDRAW_REVIEW" && ADMIN.includes(role)) continue;
    out.push(r.action);
  }
  return out;
}

/** Cari aturan transisi from→to yang sah untuk peran ini (dipakai aksi massal). */
export function findTransition(from: DocumentStatus, to: DocumentStatus, role: Role): WorkflowAction | null {
  return workflowActions(from, role).find((a) => a.to === to) ?? null;
}
