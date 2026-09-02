"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShieldCheck } from "lucide-react";
import { navForRole } from "@/lib/nav";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Navigasi untuk layar kecil (< md) — sidebar disembunyikan di sana,
 * jadi menu dibuka lewat tombol hamburger sebagai sheet dari kiri.
 */
export function MobileNav({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = navForRole(role);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Buka menu" />
        }
      >
        <Menu className="size-5" />
      </DialogTrigger>
      <DialogContent
        className="top-0 left-0 h-dvh w-72 max-w-[85%] translate-x-0 translate-y-0 gap-0 rounded-none border-r p-0 sm:max-w-72 data-open:slide-in-from-left-8 data-closed:slide-out-to-left-8"
      >
        <div className="flex h-16 items-center gap-2 border-b px-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </div>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Secure DMS
          </DialogTitle>
        </div>

        <nav className="space-y-1 p-3">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </DialogContent>
    </Dialog>
  );
}
