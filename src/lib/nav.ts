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

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Peran yang boleh melihat menu ini. */
  roles: Role[];
}

const ALL: Role[] = ["SUPER_ADMIN", "COMPANY_ADMIN", "AUDITOR", "EMPLOYEE"];

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ALL },
  { label: "Folder & Dokumen", href: "/folders", icon: FolderTree, roles: ALL },
  { label: "Semua Dokumen", href: "/documents", icon: Files, roles: ALL },
  { label: "Dibagikan ke Saya", href: "/shared", icon: Share2, roles: ALL },
  { label: "Metadata", href: "/metadata", icon: Tags, roles: ALL },
  {
    label: "Audit Log",
    href: "/audit",
    icon: ScrollText,
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "AUDITOR"],
  },
  {
    label: "Manajemen User",
    href: "/users",
    icon: Users,
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN"],
  },
  {
    label: "Sampah",
    href: "/trash",
    icon: Trash2,
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN"],
  },
  {
    label: "Otomatisasi",
    href: "/workflows",
    icon: Workflow,
    roles: ["SUPER_ADMIN", "COMPANY_ADMIN"],
  },
  { label: "Pengaturan", href: "/settings", icon: Settings, roles: ALL },
];

/** Filter menu sesuai peran pengguna. */
export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
