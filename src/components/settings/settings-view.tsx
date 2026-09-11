"use client";

import { useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Bookmark, Keyboard, Monitor, Moon, PanelLeft, RotateCcw, Sun, Trash2, LayoutGrid, List } from "lucide-react";
import { useLocalPref } from "@/hooks/use-local-pref";
import { useSavedViews, savedViewHref } from "@/lib/saved-views";
import { VIEW_MODES, type ViewMode } from "@/lib/list-filters";
import { ROLE_LABELS } from "@/lib/constants";
import { ROLE_BADGE_CLASS } from "@/lib/format";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/page-header";
import { DeleteConfirmDialog } from "@/components/folders/folder-dialogs";
import Link from "next/link";

const SIDEBAR_MODES = ["full", "slim"] as const;
const THEMES = [
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
  { value: "system", label: "Ikuti sistem", icon: Monitor },
] as const;

/** Terpasang setelah hidrasi (aman untuk nilai tema/localStorage tanpa setState di effect). */
function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/** Halaman Pengaturan: profil, tampilan, tampilan tersimpan, data lokal (mock), pintasan. */
export function SettingsView({ user }: { user: AuthUser }) {
  const mounted = useMounted();
  return (
    <div className="space-y-12">
      <ProfileSection user={user} />
      {mounted && <AppearanceSection />}
      <SavedViewsSection />
      {env.USE_MOCKS && <LocalDataSection />}
      <ShortcutsSection />
    </div>
  );
}

function ProfileSection({ user }: { user: AuthUser }) {
  return (
    <section>
      <SectionHeader title="Profil" />
      <dl className="grid gap-x-6 gap-y-4 pt-4 sm:grid-cols-3">
        <div>
          <dt className="eyebrow">Nama</dt>
          <dd className="mt-1 text-sm">{user.name}</dd>
        </div>
        <div>
          <dt className="eyebrow">Email</dt>
          <dd className="mt-1 font-mono text-[13px]">{user.email}</dd>
        </div>
        <div>
          <dt className="eyebrow">Peran</dt>
          <dd className="mt-1">
            <Badge variant="secondary" className={ROLE_BADGE_CLASS[user.role]}>
              {ROLE_LABELS[user.role]}
            </Badge>
          </dd>
        </div>
      </dl>
      <p className="pt-3 text-xs text-muted-foreground">
        Ubah nama, email, dan kata sandi menunggu endpoint profil di backend.
      </p>
    </section>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const [viewMode, setViewMode] = useLocalPref<ViewMode>("dms_folder_view", "grid", VIEW_MODES);
  const [sidebar, setSidebar] = useLocalPref<(typeof SIDEBAR_MODES)[number]>("dms_sidebar", "full", SIDEBAR_MODES);

  return (
    <section>
      <SectionHeader title="Tampilan" meta="disimpan di browser ini" />
      <div className="grid gap-8 pt-4 lg:grid-cols-3">
        <ChoiceGroup label="Tema">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <Choice key={value} active={(theme ?? "system") === value} onClick={() => setTheme(value)}>
              <Icon className="size-4" />
              {label}
            </Choice>
          ))}
        </ChoiceGroup>
        <ChoiceGroup label="Mode daftar dokumen">
          <Choice active={viewMode === "grid"} onClick={() => setViewMode("grid")}>
            <LayoutGrid className="size-4" />
            Kartu
          </Choice>
          <Choice active={viewMode === "table"} onClick={() => setViewMode("table")}>
            <List className="size-4" />
            Tabel
          </Choice>
        </ChoiceGroup>
        <ChoiceGroup label="Sidebar">
          <Choice active={sidebar === "full"} onClick={() => setSidebar("full")}>
            <PanelLeft className="size-4" />
            Penuh
          </Choice>
          <Choice active={sidebar === "slim"} onClick={() => setSidebar("slim")}>
            <PanelLeft className="size-4" />
            Ramping (ikon)
          </Choice>
        </ChoiceGroup>
      </div>
    </section>
  );
}

function ChoiceGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors",
        active ? "border-primary bg-primary/10 text-primary" : "border-input hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function SavedViewsSection() {
  const { views, update, remove } = useSavedViews();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  return (
    <section>
      <SectionHeader title="Tampilan tersimpan" meta={views.length ? `${views.length} tampilan` : undefined} />
      {views.length === 0 ? (
        <p className="pt-4 text-sm text-muted-foreground">
          Belum ada. Simpan filter dari halaman folder atau Semua Dokumen lewat tombol <b>Simpan tampilan</b>.
        </p>
      ) : (
        <div className="ledger pt-1">
          {views.map((v) => (
            <div key={v.id} className="flex flex-wrap items-center gap-3 py-3">
              <Bookmark className="size-4 shrink-0 text-muted-foreground" />
              {editing === v.id ? (
                <Input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => {
                    if (draft.trim()) update(v.id, { name: draft.trim() });
                    setEditing(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setEditing(null);
                  }}
                  className="h-8 max-w-xs"
                />
              ) : (
                <button
                  type="button"
                  className="text-left text-sm font-medium underline-offset-4 hover:underline"
                  title="Klik untuk ganti nama"
                  onClick={() => {
                    setEditing(v.id);
                    setDraft(v.name);
                  }}
                >
                  {v.name}
                </button>
              )}
              <Link href={savedViewHref(v)} className="font-mono text-[11px] text-muted-foreground hover:text-foreground">
                {v.folderName}
              </Link>
              <div className="ml-auto flex items-center gap-4 text-sm">
                <label className="flex items-center gap-1.5 text-muted-foreground">
                  <Checkbox checked={v.showInSidebar} onCheckedChange={(c) => update(v.id, { showInSidebar: Boolean(c) })} />
                  Sidebar
                </label>
                <label className="flex items-center gap-1.5 text-muted-foreground">
                  <Checkbox checked={v.showOnDashboard} onCheckedChange={(c) => update(v.id, { showOnDashboard: Boolean(c) })} />
                  Dashboard
                </label>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  aria-label={`Hapus tampilan ${v.name}`}
                  onClick={() => {
                    remove(v.id);
                    toast.success(`Tampilan “${v.name}” dihapus.`);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const MOCK_KEYS = [
  "dms_mock_data_v1",
  "dms_mock_audit_v1",
  "dms_mock_shares_v1",
  "dms_mock_share_links_v1",
  "dms_mock_notes_v1",
  "dms_mock_meta_v1",
  "dms_mock_users_v1",
  "dms_mock_workflows_v1",
  "dms_mock_content_v1",
  "dms_saved_views_v1",
  "dms_recent_docs_v1",
];

function LocalDataSection() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function reset() {
    setBusy(true);
    try {
      for (const k of MOCK_KEYS) window.localStorage.removeItem(k);
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase("dms_mock_files");
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
      toast.success("Data contoh direset. Memuat ulang…");
      setTimeout(() => window.location.assign("/dashboard"), 600);
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  }

  return (
    <section>
      <SectionHeader title="Data contoh (mode mock)" />
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
        <p className="max-w-prose text-sm text-muted-foreground">
          Semua folder, dokumen, berkas, audit, share, catatan, dan metadata di mode demo tersimpan di browser ini.
          Reset mengembalikan data awal.
        </p>
        <Button variant="outline" onClick={() => setConfirmOpen(true)} disabled={busy}>
          <RotateCcw className="size-4" />
          Reset data contoh
        </Button>
      </div>
      <DeleteConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Reset data contoh?"
        description="Semua perubahan di mode demo (dokumen, berkas yang diunggah, catatan, tampilan tersimpan) di browser ini akan hilang."
        onConfirm={reset}
        pending={busy}
      />
    </section>
  );
}

function ShortcutsSection() {
  return (
    <section>
      <SectionHeader title="Pintasan keyboard" />
      <p className="flex items-center gap-2 pt-4 text-sm text-muted-foreground">
        <Keyboard className="size-4" />
        Tekan <kbd className="rounded-sm border border-rule bg-muted/40 px-1.5 font-mono text-[11px]">?</kbd> di halaman mana pun
        untuk melihat daftar lengkap. Contoh: <kbd className="rounded-sm border border-rule bg-muted/40 px-1.5 font-mono text-[11px]">Ctrl K</kbd> cari,{" "}
        <kbd className="rounded-sm border border-rule bg-muted/40 px-1.5 font-mono text-[11px]">g</kbd> lalu{" "}
        <kbd className="rounded-sm border border-rule bg-muted/40 px-1.5 font-mono text-[11px]">o</kbd> ke Semua Dokumen.
      </p>
    </section>
  );
}
