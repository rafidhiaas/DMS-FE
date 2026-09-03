"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navForRole } from "@/lib/nav";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";
import { LogoutButton } from "@/components/logout-button";

export interface SidebarUser {
  name: string;
  email: string;
  role: Role;
}

/** Wordmark: serif untuk nama, mono kecil untuk keterangan. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Link href="/dashboard" className={cn("block", className)}>
      <span className="block font-serif text-[22px] leading-none tracking-[-0.01em]">
        Secure DMS
      </span>
      <span className="mt-2 block font-mono text-[10.5px] uppercase tracking-[0.14em] text-sidebar-muted">
        Arsip dokumen perusahaan
      </span>
    </Link>
  );
}

/** Daftar navigasi bernomor — dipakai sidebar desktop dan sheet mobile. */
export function NavList({
  role,
  onNavigate,
}: {
  role: Role;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = navForRole(role);

  return (
    <nav aria-label="Navigasi utama" className="flex flex-col gap-0.5">
      {items.map((item, i) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-sm px-3 py-2 text-[14px] transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <span
              className={cn(
                "w-5 font-mono text-[11px] tabular-nums",
                active ? "text-sidebar-primary" : "text-sidebar-muted/70",
              )}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className={cn(active && "font-medium")}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Blok identitas pengguna + tombol keluar (kaki sidebar). */
export function UserBlock({ user }: { user: SidebarUser }) {
  return (
    <div className="border-t border-sidebar-border px-6 py-5">
      <p className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</p>
      <p className="truncate font-mono text-[11px] text-sidebar-muted">{user.email}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="rounded-sm border border-sidebar-primary/50 px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-sidebar-primary">
          {ROLE_LABELS[user.role]}
        </span>
        <LogoutButton tone="sidebar" />
      </div>
    </div>
  );
}

export function AppSidebar({ user }: { user: SidebarUser }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="border-b border-sidebar-border px-6 pt-7 pb-6">
        <Wordmark />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        <p className="eyebrow mb-2 px-3 text-sidebar-muted/80">Menu</p>
        <NavList role={user.role} />
      </div>

      <UserBlock user={user} />
    </aside>
  );
}
