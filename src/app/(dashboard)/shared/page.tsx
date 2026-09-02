import type { Metadata } from "next";
import { getServerUser } from "@/lib/auth/session";
import { SharedWithMe } from "@/components/shares/shared-with-me";

export const metadata: Metadata = { title: "Dibagikan ke Saya" };

export default async function SharedPage() {
  const user = await getServerUser();
  if (!user) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dibagikan ke Saya</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dokumen yang dibagikan pengguna lain kepada Anda, beserta level aksesnya.
        </p>
      </div>
      <SharedWithMe />
    </div>
  );
}
