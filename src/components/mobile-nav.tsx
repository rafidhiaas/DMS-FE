"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NavList, UserBlock, Wordmark, type SidebarUser } from "@/components/app-sidebar";
import { SavedViewsNav } from "@/components/saved-views-nav";

/**
 * Navigasi untuk layar kecil (< md) — sidebar disembunyikan di sana,
 * jadi menu dibuka lewat tombol hamburger sebagai sheet dari kiri.
 */
export function MobileNav({ user }: { user: SidebarUser }) {
  const [open, setOpen] = useState(false);

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
        showCloseButton={false}
        className="top-0 left-0 flex h-dvh w-72 max-w-[85%] translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-sidebar p-0 text-sidebar-foreground sm:max-w-72 data-open:slide-in-from-left-8 data-closed:slide-out-to-left-8"
      >
        <div className="border-b border-sidebar-border px-6 pt-7 pb-6">
          <DialogTitle className="sr-only">Menu navigasi</DialogTitle>
          <Wordmark />
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5">
          <NavList role={user.role} onNavigate={() => setOpen(false)} />
          <SavedViewsNav onNavigate={() => setOpen(false)} />
        </div>

        <UserBlock user={user} />
      </DialogContent>
    </Dialog>
  );
}
