"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { hasActiveFilters, SORT_LABELS, type ListFilters, type ViewMode } from "@/lib/list-filters";
import { STATUS_META } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Ringkasan filter dalam bahasa manusia untuk ditampilkan sebelum menyimpan. */
export function describeFilters(f: ListFilters, view: ViewMode): string[] {
  const parts: string[] = [];
  if (f.query.trim()) parts.push(`kata kunci “${f.query.trim()}”`);
  if (f.statuses.length) parts.push(`status ${f.statuses.map((s) => STATUS_META[s].label).join("/")}`);
  if (f.extensions.length) parts.push(`tipe ${f.extensions.map((e) => e.toUpperCase()).join("/")}`);
  parts.push(`urut ${SORT_LABELS[f.sort].toLowerCase()}`);
  parts.push(view === "table" ? "tampilan tabel" : "tampilan kartu");
  return parts;
}

/** Dialog "Simpan tampilan" — beri nama filter aktif dan pilih tempat memasangnya. */
export function SaveViewDialog({
  open,
  onOpenChange,
  folderName,
  filters,
  view,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  folderName: string;
  filters: ListFilters;
  view: ViewMode;
  onSubmit: (input: { name: string; showInSidebar: boolean; showOnDashboard: boolean }) => void;
}) {
  const [name, setName] = useState("");
  const [sidebar, setSidebar] = useState(true);
  const [dashboard, setDashboard] = useState(true);
  const summary = describeFilters(filters, view);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="size-4" />
            Simpan tampilan
          </DialogTitle>
          <DialogDescription>
            Filter dan urutan folder “{folderName}” disimpan dengan nama agar bisa dibuka cepat dari
            sidebar atau dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="view-name">Nama tampilan</Label>
            <Input
              id="view-name"
              autoFocus
              value={name}
              placeholder="mis. Menunggu review — Keuangan"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) {
                  onSubmit({ name: name.trim(), showInSidebar: sidebar, showOnDashboard: dashboard });
                }
              }}
            />
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="eyebrow mb-1.5">Isi tampilan</p>
            <p className="text-muted-foreground">
              Folder <span className="text-foreground">{folderName}</span> · {summary.join(" · ")}
              {!hasActiveFilters(filters) && (
                <span className="block pt-1 text-xs">Tanpa filter — tampilan ini membuka seluruh isi folder.</span>
              )}
            </p>
          </div>

          <div className="space-y-2.5">
            <label className="flex items-center gap-2.5 text-sm">
              <Checkbox checked={sidebar} onCheckedChange={(v) => setSidebar(Boolean(v))} />
              Tampilkan di sidebar
            </label>
            <label className="flex items-center gap-2.5 text-sm">
              <Checkbox checked={dashboard} onCheckedChange={(v) => setDashboard(Boolean(v))} />
              Tampilkan sebagai panel di dashboard
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() => onSubmit({ name: name.trim(), showInSidebar: sidebar, showOnDashboard: dashboard })}
          >
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
