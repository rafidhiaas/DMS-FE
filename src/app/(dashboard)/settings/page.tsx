import type { Metadata } from "next";
import { getServerUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { SettingsView } from "@/components/settings/settings-view";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function SettingsPage() {
  const user = await getServerUser();
  if (!user) return null;
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="Akun"
        title="Pengaturan"
        description="Profil, preferensi tampilan, tampilan tersimpan, dan pintasan."
      />
      <SettingsView user={user} />
    </div>
  );
}
