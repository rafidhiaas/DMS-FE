import type { Metadata } from "next";
import { getServerUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/constants";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";

export const metadata: Metadata = { title: "Dashboard" };

function todayLabel() {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function DashboardPage() {
  const user = await getServerUser();
  if (!user) return null;

  return (
    <div className="mx-auto max-w-6xl">
      <DashboardOverview
        role={user.role}
        firstName={user.name.split(" ")[0]}
        roleLabel={ROLE_LABELS[user.role]}
        dateLabel={todayLabel()}
      />
    </div>
  );
}
