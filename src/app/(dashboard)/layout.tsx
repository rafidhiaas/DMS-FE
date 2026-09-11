import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { MockActor } from "@/components/providers/mock-actor";
import { GlobalSearch } from "@/components/global-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();

  // Pengaman berlapis — proxy sudah menjaga, tapi pastikan lagi di server.
  if (!user) redirect("/login");

  const sidebarUser = { name: user.name, email: user.email, role: user.role };

  return (
    <div className="flex min-h-screen flex-1">
      {/* Teruskan identitas user login ke mock store (audit/share) di sisi client. */}
      <MockActor user={user} />
      <KeyboardShortcuts role={user.role} />
      <AppSidebar user={sidebarUser} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Kop tipis hanya untuk layar kecil; di desktop identitas ada di sidebar. */}
        <header className="flex h-14 items-center gap-2 border-b border-rule px-3 md:hidden">
          <MobileNav user={sidebarUser} />
          <span className="flex-1 font-serif text-lg leading-none">Secure DMS</span>
          <GlobalSearch tone="header" />
          <ThemeToggle />
        </header>

        <main className="flex-1 px-5 py-8 md:px-10 md:py-10 lg:px-14">{children}</main>
      </div>
    </div>
  );
}
