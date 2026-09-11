import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { WorkflowManager } from "@/components/workflows/workflow-manager";

export const metadata: Metadata = { title: "Otomatisasi" };

export default async function WorkflowsPage() {
  const user = await getServerUser();
  if (!user) return null;
  if (user.role !== "SUPER_ADMIN" && user.role !== "COMPANY_ADMIN") redirect("/dashboard");
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Pengaturan arsip"
        title="Otomatisasi"
        description="Aturan yang berjalan otomatis saat dokumen diunggah atau statusnya berubah — pola Workflows di Paperless-ngx."
      />
      <WorkflowManager />
    </div>
  );
}
