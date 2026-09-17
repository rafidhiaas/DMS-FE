import { api } from "@/lib/api/client";
import type { DocumentStatus, WorkflowRule, WorkflowRuleInput, WorkflowTrigger } from "@/types";
import { unwrap } from "@/lib/api/_transform";

/**
 * Otomatisasi (workflow rules) → backend `/api/workflows` (admin).
 * Aturan dievaluasi di server saat unggah / status berubah.
 */

interface BeWorkflowRule {
  id: string;
  name: string;
  enabled: boolean;
  sortOrder: number;
  trigger: WorkflowTrigger;
  triggerStatus: DocumentStatus | null;
  matchFolderId: string | null;
  matchExtensions: string[];
  matchTitleContains: string;
  assignTagIds: string[];
  assignTypeId: string | null;
  assignCorrespondentId: string | null;
  assignStatus: DocumentStatus | null;
  runCount: number;
  lastRunAt: string | null;
  createdAt: string;
}

function mapRule(r: BeWorkflowRule): WorkflowRule {
  return {
    id: r.id,
    name: r.name,
    enabled: r.enabled,
    order: r.sortOrder,
    trigger: r.trigger,
    trigger_status: r.triggerStatus ?? null,
    match_folder_id: r.matchFolderId ?? null,
    match_extensions: r.matchExtensions ?? [],
    match_title_contains: r.matchTitleContains ?? "",
    assign_tag_ids: r.assignTagIds ?? [],
    assign_type_id: r.assignTypeId ?? null,
    assign_correspondent_id: r.assignCorrespondentId ?? null,
    assign_status: r.assignStatus ?? null,
    run_count: r.runCount ?? 0,
    last_run_at: r.lastRunAt ?? null,
    created_at: r.createdAt,
  };
}

export async function fetchWorkflows(): Promise<WorkflowRule[]> {
  const { data } = await api.get<unknown>("/workflows");
  return (unwrap<BeWorkflowRule[]>(data) ?? []).map(mapRule);
}

// Body memakai snake_case (sama dengan bentuk WorkflowRuleInput).
export async function createWorkflow(input: WorkflowRuleInput): Promise<WorkflowRule> {
  const { data } = await api.post<unknown>("/workflows", input);
  return mapRule(unwrap<BeWorkflowRule>(data));
}

export async function updateWorkflow(id: string, patch: Partial<WorkflowRuleInput>): Promise<WorkflowRule> {
  const { data } = await api.patch<unknown>(`/workflows/${id}`, patch);
  return mapRule(unwrap<BeWorkflowRule>(data));
}

export async function deleteWorkflow(id: string): Promise<void> {
  await api.delete(`/workflows/${id}`);
}

export async function moveWorkflow(id: string, direction: "up" | "down"): Promise<void> {
  await api.post(`/workflows/${id}/move`, { direction });
}