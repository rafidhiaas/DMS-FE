import { env } from "@/lib/env";
import { api } from "@/lib/api/client";
import { mockMetaStore } from "@/lib/mocks/meta-store";
import type { CustomField, CustomFieldInput, CustomFieldValue } from "@/types";

/**
 * Bidang khusus (custom fields) ala Paperless: definisi bidang (teks, angka, tanggal,
 * ya/tidak, pilihan, uang, tautan) + nilai per dokumen di `document.custom_fields`.
 * Backend belum punya; usulan endpoint: GET/POST /custom-fields, PATCH/DELETE /custom-fields/:id.
 */

export async function fetchCustomFields(): Promise<CustomField[]> {
  if (env.USE_MOCKS) return mockMetaStore.listFields();
  const { data } = await api.get<{ items: CustomField[] }>("/custom-fields");
  return data.items;
}

export async function createCustomField(input: CustomFieldInput): Promise<CustomField> {
  if (env.USE_MOCKS) return mockMetaStore.createField(input);
  const { data } = await api.post<{ item: CustomField }>("/custom-fields", input);
  return data.item;
}

export async function updateCustomField(id: string, patch: Partial<CustomFieldInput>): Promise<CustomField> {
  if (env.USE_MOCKS) return mockMetaStore.updateField(id, patch);
  const { data } = await api.patch<{ item: CustomField }>(`/custom-fields/${id}`, patch);
  return data.item;
}

export async function deleteCustomField(id: string): Promise<void> {
  if (env.USE_MOCKS) return mockMetaStore.removeField(id);
  await api.delete(`/custom-fields/${id}`);
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
