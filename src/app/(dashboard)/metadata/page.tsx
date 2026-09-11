import type { Metadata } from "next";
import { getServerUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { MetadataManager } from "@/components/metadata/metadata-manager";

export const metadata: Metadata = { title: "Metadata" };

export default async function MetadataPage() {
  const user = await getServerUser();
  if (!user) return null;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Pengaturan arsip"
        title="Metadata dokumen"
        description="Tag, tipe dokumen, dan pihak dipakai untuk menandai, memfilter, dan mencari dokumen di seluruh folder."
      />
      <MetadataManager canWrite={user.role !== "AUDITOR"} />
    </div>
  );
}
