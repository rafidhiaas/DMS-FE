import {
  LayoutDashboard,
  FolderTree,
  Share2,
  ScrollText,
  Users,
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
  { label: "Dibagikan ke Saya", href: "/shared", icon: Share2, roles: ALL },
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
];

/** Filter menu sesuai peran pengguna. */
export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
