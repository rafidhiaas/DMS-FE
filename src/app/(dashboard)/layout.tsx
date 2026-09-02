import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/constants";
import { AppSidebar } from "@/components/app-sidebar";
import { LogoutButton } from "@/components/logout-button";
import { MobileNav } from "@/components/mobile-nav";
import { MockActor } from "@/components/providers/mock-actor";
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
      {/* Teruskan identitas user login ke mock store (audit/share) di sisi client. */}
      <MockActor user={user} />
      <AppSidebar role={user.role} />

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-3 border-b bg-card px-4 md:px-6">
          <div className="flex items-center gap-1 md:hidden">
            <MobileNav role={user.role} />
            <span className="text-lg font-semibold">Secure DMS</span>
          </div>
          <div className="ml-auto flex items-center gap-3 md:gap-4">
            <div className="hidden text-right sm:block">
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
