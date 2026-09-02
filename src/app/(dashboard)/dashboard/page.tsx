import type { Metadata } from "next";
import { getServerUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/constants";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getServerUser();
  if (!user) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Halo, {user.name.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground">
          Anda masuk sebagai{" "}
          <span className="font-medium text-foreground">{ROLE_LABELS[user.role]}</span>.
          Berikut ringkasan Secure DMS Anda.
        </p>
      </div>

      <DashboardOverview role={user.role} />
    </div>
  );
}
