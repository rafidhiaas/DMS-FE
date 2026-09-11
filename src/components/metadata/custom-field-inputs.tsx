"use client";

import { useCustomFields } from "@/hooks/use-custom-fields";
import { CUSTOM_FIELD_TYPE_LABELS } from "@/lib/api/custom-fields";
import type { CustomField, CustomFieldValue } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";

/** Kumpulan input bidang khusus di dialog metadata; nilai kosong disimpan sebagai null. */
export function CustomFieldInputs({
  values,
  onChange,
}: {
  values: Record<string, CustomFieldValue>;
  onChange: (fieldId: string, value: CustomFieldValue) => void;
}) {
  const fields = useCustomFields();
  if (fields.isLoading) return <Skeleton className="h-16 rounded-md" />;
  const list = fields.data ?? [];
  if (list.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label>Bidang khusus</Label>
      <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
        {list.map((f) => (
          <FieldInput key={f.id} field={f} value={values[f.id] ?? null} onChange={(v) => onChange(f.id, v)} />
        ))}
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: CustomField;
  value: CustomFieldValue;
  onChange: (v: CustomFieldValue) => void;
}) {
  const id = `cf-${field.id}`;
  const hint = <span className="ml-1 font-mono text-[10px] text-muted-foreground">{CUSTOM_FIELD_TYPE_LABELS[field.type]}</span>;

  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <Checkbox checked={value === true} onCheckedChange={(v) => onChange(v === true ? true : v === false && value === null ? null : Boolean(v))} />
        {field.name}
        {hint}
      </label>
    );
  }

  if (field.type === "select") {
    const options = [{ value: NONE, label: "— Tidak diisi —" }, ...(field.options ?? []).map((o) => ({ value: o, label: o }))];
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-xs">
          {field.name}
          {hint}
        </Label>
        <Select value={value === null ? NONE : String(value)} items={options} onValueChange={(v) => onChange(v === NONE ? null : String(v))}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  const inputType = field.type === "date" ? "date" : field.type === "number" || field.type === "money" ? "number" : field.type === "url" ? "url" : "text";
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {field.name}
        {hint}
      </Label>
      <Input
        id={id}
        type={inputType}
        inputMode={inputType === "number" ? "decimal" : undefined}
        value={value === null ? "" : String(value)}
        placeholder={field.type === "url" ? "https://…" : field.type === "money" ? "0" : undefined}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") onChange(null);
          else if (inputType === "number") onChange(Number(raw));
          else onChange(raw);
        }}
      />
    </div>
  );
}
