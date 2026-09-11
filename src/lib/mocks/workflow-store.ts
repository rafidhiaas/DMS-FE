import type { DocumentItem, DocumentStatus, WorkflowRule, WorkflowRuleInput, WorkflowTrigger } from "@/types";

/**
 * MOCK store Otomatisasi (Workflows ala Paperless-ngx): aturan "jika X terjadi
 * pada dokumen yang cocok, lakukan Y". Dievaluasi oleh dms-store saat unggah dan
 * saat status berubah. Store ini TIDAK mengimpor dms-store (hindari siklus).
 */

const STORAGE_KEY = "dms_mock_workflows_v1";

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `wf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function seed(): WorkflowRule[] {
  return [
    {
      id: "seed-wf-baru",
      name: "Tandai unggahan baru",
      enabled: true,
      order: 1,
      trigger: "upload",
      trigger_status: null,
      match_folder_id: null,
      match_extensions: [],
      match_title_contains: "",
      assign_tag_ids: ["seed-tag-baru"],
      assign_type_id: null,
      assign_correspondent_id: null,
      assign_status: null,
      run_count: 0,
      last_run_at: null,
      created_at: new Date().toISOString(),
    },
    {
      id: "seed-wf-kontrak",
      name: "Kontrak di folder Legal",
      enabled: true,
      order: 2,
      trigger: "upload",
      trigger_status: null,
      match_folder_id: "seed-folder-legal",
      match_extensions: ["pdf", "docx"],
      match_title_contains: "",
      assign_tag_ids: ["seed-tag-kontrak"],
      assign_type_id: "seed-type-kontrak",
      assign_correspondent_id: null,
      assign_status: null,
      run_count: 0,
      last_run_at: null,
      created_at: new Date().toISOString(),
    },
  ];
}

function load(): WorkflowRule[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = seed();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw) as WorkflowRule[];
  } catch {
    const initial = seed();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

function save(rules: WorkflowRule[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

function delay<T>(value: T, ms = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function matches(rule: WorkflowRule, doc: DocumentItem): boolean {
  if (rule.match_folder_id && rule.match_folder_id !== doc.folder_id) return false;
  if (rule.match_extensions.length > 0 && !rule.match_extensions.includes(doc.extension)) return false;
  const needle = rule.match_title_contains.trim().toLowerCase();
  if (needle && !doc.title.toLowerCase().includes(needle)) return false;
  return true;
}

export interface WorkflowOutcome {
  /** Nama aturan yang diterapkan (urut). */
  applied: string[];
  /** Perubahan gabungan yang harus diterapkan pemanggil ke dokumen. */
  add_tag_ids: string[];
  document_type_id?: string | null;
  correspondent_id?: string | null;
  status?: DocumentStatus;
}

/**
 * Evaluasi aturan aktif untuk sebuah pemicu. Mengembalikan perubahan gabungan;
 * pemanggil (dms-store) yang menerapkan dan menyimpan dokumen.
 */
export function evaluateWorkflows(
  trigger: WorkflowTrigger,
  doc: DocumentItem,
  ctx: { newStatus?: DocumentStatus } = {},
): WorkflowOutcome {
  const rules = load()
    .filter((r) => r.enabled && r.trigger === trigger)
    .filter((r) => trigger !== "status_change" || !r.trigger_status || r.trigger_status === ctx.newStatus)
    .sort((a, b) => a.order - b.order);

  const outcome: WorkflowOutcome = { applied: [], add_tag_ids: [] };
  const now = new Date().toISOString();
  let touched = false;
  for (const rule of rules) {
    if (!matches(rule, doc)) continue;
    outcome.applied.push(rule.name);
    for (const t of rule.assign_tag_ids) if (!outcome.add_tag_ids.includes(t)) outcome.add_tag_ids.push(t);
    if (rule.assign_type_id) outcome.document_type_id = rule.assign_type_id;
    if (rule.assign_correspondent_id) outcome.correspondent_id = rule.assign_correspondent_id;
    if (trigger === "upload" && rule.assign_status) outcome.status = rule.assign_status;
    rule.run_count += 1;
    rule.last_run_at = now;
    touched = true;
  }
  if (touched) save(load().map((r) => rules.find((x) => x.id === r.id) ?? r));
  return outcome;
}

export const mockWorkflowStore = {
  async list(): Promise<WorkflowRule[]> {
    return delay([...load()].sort((a, b) => a.order - b.order));
  },

  async create(input: WorkflowRuleInput): Promise<WorkflowRule> {
    const name = input.name.trim();
    if (!name) throw new Error("Nama aturan wajib diisi.");
    const rules = load();
    const rule: WorkflowRule = {
      ...input,
      name,
      id: uuid(),
      order: rules.length + 1,
      run_count: 0,
      last_run_at: null,
      created_at: new Date().toISOString(),
    };
    rules.push(rule);
    save(rules);
    return delay(rule);
  },

  async update(id: string, patch: Partial<WorkflowRuleInput>): Promise<WorkflowRule> {
    const rules = load();
    const rule = rules.find((r) => r.id === id);
    if (!rule) throw new Error("Aturan tidak ditemukan.");
    if (patch.name !== undefined && !patch.name.trim()) throw new Error("Nama aturan wajib diisi.");
    Object.assign(rule, patch, patch.name !== undefined ? { name: patch.name.trim() } : {});
    save(rules);
    return delay(rule);
  },

  async remove(id: string): Promise<void> {
    const rules = load();
    if (!rules.some((r) => r.id === id)) throw new Error("Aturan tidak ditemukan.");
    save(rules.filter((r) => r.id !== id).map((r, i) => ({ ...r, order: i + 1 })));
    return delay(undefined);
  },

  async move(id: string, direction: "up" | "down"): Promise<void> {
    const rules = [...load()].sort((a, b) => a.order - b.order);
    const i = rules.findIndex((r) => r.id === id);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i === -1 || j < 0 || j >= rules.length) return delay(undefined);
    [rules[i], rules[j]] = [rules[j], rules[i]];
    save(rules.map((r, k) => ({ ...r, order: k + 1 })));
    return delay(undefined);
  },
};
