import { api } from "@/lib/api/client";
import type { CustomField, CustomFieldInput, CustomFieldValue } from "@/types";
import { unwrap } from "@/lib/api/_transform";

/**
 * Bidang khusus (custom fields) ala Paperless: definisi bidang (teks, angka, tanggal,
 * ya/tidak, pilihan, uang, tautan) + nilai per dokumen di `document.custom_fields`.
 * Backend: `/api/metadata/custom-fields`.
 */

const PATH = "/metadata/custom-fields";

interface BeCustomField {
  id: string;
  name: string;
  type: CustomField["type"];
  options?: string[];
  createdAt?: string;
  documentCount?: number;
}

function mapField(f: BeCustomField): CustomField {
  return {
    id: f.id,
    name: f.name,
    type: f.type,
    ...(f.type === "select" ? { options: f.options ?? [] } : {}),
    created_at: f.createdAt ?? "",
    document_count: f.documentCount ?? 0,
  };
}

export async function fetchCustomFields(): Promise<CustomField[]> {
  const { data } = await api.get<unknown>(PATH);
  return (unwrap<BeCustomField[]>(data) ?? []).map(mapField);
}

export async function createCustomField(input: CustomFieldInput): Promise<CustomField> {
  const { data } = await api.post<unknown>(PATH, input);
  return mapField(unwrap<BeCustomField>(data));
}

export async function updateCustomField(id: string, patch: Partial<CustomFieldInput>): Promise<CustomField> {
  const { data } = await api.patch<unknown>(`${PATH}/${id}`, patch);
  return mapField(unwrap<BeCustomField>(data));
}

export async function deleteCustomField(id: string): Promise<void> {
  await api.delete(`${PATH}/${id}`);
}

export const CUSTOM_FIELD_TYPE_LABELS: Record<CustomField["type"], string> = {
  text: "Teks",
  number: "Angka",
  date: "Tanggal",
  boolean: "Ya / Tidak",
  select: "Pilihan",
  money: "Uang (Rp)",
  url: "Tautan",
};

/** Format nilai bidang untuk tampilan. */
export function formatCustomValue(field: CustomField, value: CustomFieldValue | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  switch (field.type) {
    case "boolean":
      return value ? "Ya" : "Tidak";
    case "money":
      return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value));
    case "number":
      return new Intl.NumberFormat("id-ID").format(Number(value));
    case "date":
      return new Date(String(value)).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    default:
      return String(value);
  }
}
