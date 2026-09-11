"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { navForRole } from "@/lib/nav";
import { useLocalPref } from "@/hooks/use-local-pref";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";
import { LogoutButton } from "@/components/logout-button";
import { GlobalSearch } from "@/components/global-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { SavedViewsNav } from "@/components/saved-views-nav";

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

/** Daftar navigasi bernomor — dipakai sidebar desktop dan sheet mobile. Mode `slim` = ikon saja. */
export function NavList({
  role,
  onNavigate,
  slim = false,
}: {
  role: Role;
  onNavigate?: () => void;
  slim?: boolean;
}) {
  const pathname = usePathname();
  const items = navForRole(role);

  return (
    <nav aria-label="Navigasi utama" className="flex flex-col gap-0.5">
      {items.map((item, i) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            title={slim ? item.label : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-sm text-[14px] transition-colors",
              slim ? "size-9 justify-center" : "px-3 py-2",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            {slim ? (
              <Icon className={cn("size-4", active && "text-sidebar-primary")} />
            ) : (
              <>
                <span
                  className={cn(
                    "w-5 font-mono text-[11px] tabular-nums",
                    active ? "text-sidebar-primary" : "text-sidebar-muted/70",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={cn(active && "font-medium")}>{item.label}</span>
              </>
            )}
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
        <span className="rounded-sm border border-sidebar-primary/50 px-1.5 py-0.5 font-mono text-[10.5px] whitespace-nowrap uppercase tracking-[0.08em] text-sidebar-primary">
          {ROLE_LABELS[user.role]}
        </span>
        <LogoutButton tone="sidebar" />
      </div>
    </div>
  );
}

const SIDEBAR_PREF_KEY = "dms_sidebar";
const SIDEBAR_MODES = ["full", "slim"] as const;

/** Sidebar desktop; bisa diramping (ikon saja) ala "slim sidebar" Paperless — preferensi per browser. */
export function AppSidebar({ user }: { user: SidebarUser }) {
  const [mode, setMode] = useLocalPref<(typeof SIDEBAR_MODES)[number]>(SIDEBAR_PREF_KEY, "full", SIDEBAR_MODES);
  const slim = mode === "slim";
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <aside
      data-slim={slim || undefined}
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] md:flex",
        slim ? "w-16" : "w-60",
      )}
    >
      <div className={cn("border-b border-sidebar-border", slim ? "px-3 pt-6 pb-5" : "px-6 pt-7 pb-6")}>
        {slim ? (
          <Link href="/dashboard" className="block text-center font-serif text-[22px] leading-none" title="Secure DMS">
            S
          </Link>
        ) : (
          <Wordmark />
        )}
      </div>

      <div className={cn("flex items-center gap-2 px-3 pt-4", slim && "flex-col")}>
        <div className={cn("min-w-0", !slim && "flex-1")}>
          <GlobalSearch tone="sidebar" compact={slim} />
        </div>
        <ThemeToggle tone="sidebar" className="size-9" />
      </div>

      <div className={cn("flex-1 overflow-y-auto px-3 py-5", slim && "flex flex-col items-center")}>
        {!slim && <p className="eyebrow mb-2 px-3 text-sidebar-muted/80">Menu</p>}
        <NavList role={user.role} slim={slim} />
        {!slim && <SavedViewsNav />}
      </div>

      {slim ? (
        <div className="flex flex-col items-center gap-3 border-t border-sidebar-border px-3 py-4">
          <span
            title={`${user.name} · ${ROLE_LABELS[user.role]}`}
            className="flex size-9 items-center justify-center rounded-sm border border-sidebar-primary/50 font-mono text-[11px] text-sidebar-primary"
          >
            {initials}
          </span>
          <LogoutButton tone="sidebar" iconOnly />
        </div>
      ) : (
        <UserBlock user={user} />
      )}

      <button
        type="button"
        onClick={() => setMode(slim ? "full" : "slim")}
        aria-label={slim ? "Lebarkan sidebar" : "Rampingkan sidebar"}
        title={slim ? "Lebarkan sidebar" : "Rampingkan sidebar"}
        className={cn(
          "flex items-center gap-2 border-t border-sidebar-border py-2.5 text-[12px] text-sidebar-muted transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
          slim ? "justify-center" : "px-6",
        )}
      >
        {slim ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        {!slim && "Rampingkan"}
      </button>
    </aside>
  );
}
