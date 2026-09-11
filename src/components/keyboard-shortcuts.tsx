"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Keyboard } from "lucide-react";
import { navForRole } from "@/lib/nav";
import type { Role } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Pintasan navigasi "g lalu huruf" (pola Gmail/Paperless). */
const GO_KEYS: Record<string, string> = {
  d: "/dashboard",
  f: "/folders",
  s: "/shared",
  a: "/audit",
  u: "/users",
  t: "/trash",
};

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/**
 * Pintasan keyboard global + dialog bantuan (tekan `?`).
 * Dipasang sekali di layout dashboard; tidak aktif saat fokus berada di kolom isian.
 */
export function KeyboardShortcuts({ role }: { role: Role }) {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    let pendingGo = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const allowed = new Set(navForRole(role).map((n) => n.href));

    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTyping(e.target)) return;

      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }

      if (pendingGo) {
        pendingGo = false;
        clearTimeout(timer);
        const href = GO_KEYS[e.key.toLowerCase()];
        if (href && allowed.has(href)) {
          e.preventDefault();
          router.push(href);
        }
        return;
      }

      if (e.key.toLowerCase() === "g") {
        pendingGo = true;
        timer = setTimeout(() => (pendingGo = false), 1200);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(timer);
    };
  }, [role, router]);

  const nav = navForRole(role);
  const goRows = Object.entries(GO_KEYS)
    .map(([key, href]) => ({ key, item: nav.find((n) => n.href === href) }))
    .filter((r) => r.item);

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-4" />
            Pintasan keyboard
          </DialogTitle>
          <DialogDescription>Tekan ? kapan saja untuk membuka daftar ini.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 text-sm">
          <Section title="Umum">
            <Row keys={["Ctrl", "K"]} label="Cari folder atau dokumen" />
            <Row keys={["?"]} label="Buka / tutup bantuan pintasan" />
            <Row keys={["Esc"]} label="Tutup dialog" />
          </Section>
          <Section title="Navigasi (tekan g, lalu huruf)">
            {goRows.map(({ key, item }) => (
              <Row key={key} keys={["g", key]} label={item!.label} />
            ))}
          </Section>
          <Section title="Halaman dokumen">
            <Row keys={["Ctrl", "Enter"]} label="Kirim catatan" />
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-2">{title}</p>
      <div className="ledger">{children}</div>
    </div>
  );
}

function Row({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span>{label}</span>
      <span className="flex items-center gap-1">
        {keys.map((k, i) => (
          <kbd
            key={i}
            className="min-w-6 rounded-sm border border-rule bg-muted/40 px-1.5 py-0.5 text-center font-mono text-[11px]"
          >
            {k}
          </kbd>
        ))}
      </span>
    </div>
  );
}
