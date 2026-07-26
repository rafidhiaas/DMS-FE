import type { Metadata } from "next";
import { FolderTree, Share2, ScrollText, ShieldCheck } from "lucide-react";
import { getServerUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

const cards = [
  {
    title: "Folder & Dokumen",
    description: "Kelola struktur folder dan berkas Anda.",
    icon: FolderTree,
  },
  {
    title: "Dibagikan ke Saya",
    description: "Dokumen yang dibagikan rekan kepada Anda.",
    icon: Share2,
  },
  {
    title: "Audit Log",
    description: "Jejak aktivitas untuk kebutuhan kepatuhan.",
    icon: ScrollText,
  },
];

export default async function DashboardPage() {
  const user = await getServerUser();

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Halo, {user?.name?.split(" ")[0] ?? "Pengguna"} 👋
        </h1>
        <p className="text-muted-foreground">
          Anda masuk sebagai{" "}
          <span className="font-medium text-foreground">
            {user ? ROLE_LABELS[user.role] : "-"}
          </span>
          . Selamat datang di Secure DMS.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <c.icon className="size-5" />
              </div>
              <CardTitle className="text-base">{c.title}</CardTitle>
              <CardDescription>{c.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="border-dashed">
        <CardContent className="flex items-start gap-3 pt-6">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              Fondasi (Tahap 1) selesai.
            </span>{" "}
            Autentikasi BFF dengan HttpOnly cookie, Edge auth guard (proxy),
            proxy API otomatis dengan refresh token, dan shell dashboard sudah
            aktif. Modul folder, dokumen, share, dan audit menyusul di tahap
            berikutnya.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
