import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { AuditLogTable } from "@/components/audit/audit-log-table";

export const metadata: Metadata = { title: "Audit Log" };

export default async function AuditPage() {
  const user = await getServerUser();
  if (!user) return null;

  // EMPLOYEE tidak punya menu audit — halaman ini khusus admin/auditor.
  // (Backend sendiri tetap membatasi: non-global hanya melihat log miliknya.)
  if (user.role === "EMPLOYEE") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Jejak aktivitas pengguna untuk kebutuhan kepatuhan.
          {user.role === "COMPANY_ADMIN" &&
            " Peran Anda hanya melihat aktivitas Anda sendiri."}
        </p>
      </div>
      <AuditLogTable role={user.role} />
    </div>
  );
}
