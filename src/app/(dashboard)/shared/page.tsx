import type { Metadata } from "next";
import { getServerUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { SharedWithMe } from "@/components/shares/shared-with-me";

export const metadata: Metadata = { title: "Dibagikan ke Saya" };

export default async function SharedPage() {
  const user = await getServerUser();
  if (!user) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Kolaborasi"
        title="Dibagikan ke Saya"
        description="Dokumen yang dibagikan pengguna lain kepada Anda, beserta level aksesnya."
      />
      <SharedWithMe />
    </div>
  );
}
