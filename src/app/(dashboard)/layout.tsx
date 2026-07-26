import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/constants";
import { AppSidebar } from "@/components/app-sidebar";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();

  // Pengaman berlapis — proxy sudah menjaga, tapi pastikan lagi di server.
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-1">
      <AppSidebar role={user.role} />

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
          <div className="md:hidden text-lg font-semibold">Secure DMS</div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium leading-tight">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
