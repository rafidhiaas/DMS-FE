import {
  LayoutDashboard,
  FolderTree,
  Files,
  Share2,
  ScrollText,
  Users,
  Trash2,
  Tags,
  Settings,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/types";

export type NavGroupKey = "arsip" | "pengaturan-arsip" | "administrasi" | "akun";

export const NAV_GROUP_LABELS: Record<NavGroupKey, string> = {
  arsip: "Arsip",
  "pengaturan-arsip": "Pengaturan arsip",
  administrasi: "Administrasi",
  akun: "Akun",
};

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Peran yang boleh melihat menu ini. */
  roles: Role[];
  /** Kelompok di sidebar. */
  group: NavGroupKey;
}

const ALL: Role[] = ["SUPER_ADMIN", "COMPANY_ADMIN", "AUDITOR", "EMPLOYEE"];

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ALL, group: "arsip" },
  { label: "Folder & Dokumen", href: "/folders", icon: FolderTree, roles: ALL, group: "arsip" },
  { label: "Semua Dokumen", href: "/documents", icon: Files, roles: ALL, group: "arsip" },
  { label: "Dibagikan ke Saya", href: "/shared", icon: Share2, roles: ALL, group: "arsip" },
  { label: "Metadata", href: "/metadata", icon: Tags, roles: ALL, group: "pengaturan-arsip" },
  {
    label: "Audit Log",
    href: "/audit",
    icon: ScrollText,
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "AUDITOR"],
    group: "administrasi",
  },
  {
    label: "Manajemen User",
    href: "/users",
    icon: Users,
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN"],
    group: "administrasi",
  },
  {
    label: "Sampah",
    href: "/trash",
    icon: Trash2,
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN"],
    group: "administrasi",
  },
  {
    label: "Otomatisasi",
    href: "/workflows",
    icon: Workflow,
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN"],
    group: "pengaturan-arsip",
  },
  { label: "Pengaturan", href: "/settings", icon: Settings, roles: ALL, group: "akun" },
];

/** Filter menu sesuai peran pengguna. */
export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

const GROUP_ORDER: NavGroupKey[] = ["arsip", "pengaturan-arsip", "administrasi", "akun"];

/** Menu terkelompok (urutan tetap), hanya kelompok yang punya item untuk peran ini. */
export function navGroupsForRole(role: Role): Array<{ key: NavGroupKey; label: string; items: NavItem[] }> {
  const items = navForRole(role);
  return GROUP_ORDER.map((key) => ({ key, label: NAV_GROUP_LABELS[key], items: items.filter((i) => i.group === key) })).filter(
    (g) => g.items.length > 0,
  );
}
