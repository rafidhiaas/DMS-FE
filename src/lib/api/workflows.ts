import { env } from "@/lib/env";
import { api } from "@/lib/api/client";
import { mockWorkflowStore } from "@/lib/mocks/workflow-store";
import { recordActivity } from "@/lib/mocks/audit-store";
import type { WorkflowRule, WorkflowRuleInput } from "@/types";

/**
 * Lapisan akses data Otomatisasi (workflow rules).
 * Backend belum punya; usulan endpoint: GET/POST /workflows, PATCH/DELETE /workflows/:id,
 * POST /workflows/:id/move. Evaluasi aturan idealnya di server saat unggah / ubah status.
 */

export async function fetchWorkflows(): Promise<WorkflowRule[]> {
  if (env.USE_MOCKS) return mockWorkflowStore.list();
  const { data } = await api.get<{ items: WorkflowRule[] }>("/workflows");
  return data.items;
}

export async function createWorkflow(input: WorkflowRuleInput): Promise<WorkflowRule> {
  if (env.USE_MOCKS) {
    const rule = await mockWorkflowStore.create(input);
    recordActivity("UPDATE_WORKFLOW", `Membuat aturan otomatisasi "${rule.name}"`);
    return rule;
  }
  const { data } = await api.post<{ item: WorkflowRule }>("/workflows", input);
  return data.item;
}

export async function updateWorkflow(id: string, patch: Partial<WorkflowRuleInput>): Promise<WorkflowRule> {
  if (env.USE_MOCKS) {
    const rule = await mockWorkflowStore.update(id, patch);
    recordActivity(
      "UPDATE_WORKFLOW",
      patch.enabled === undefined
        ? `Mengubah aturan otomatisasi "${rule.name}"`
        : `${patch.enabled ? "Mengaktifkan" : "Menonaktifkan"} aturan otomatisasi "${rule.name}"`,
    );
    return rule;
  }
  const { data } = await api.patch<{ item: WorkflowRule }>(`/workflows/${id}`, patch);
  return data.item;
}

export async function deleteWorkflow(id: string): Promise<void> {
  if (env.USE_MOCKS) {
    await mockWorkflowStore.remove(id);
    recordActivity("UPDATE_WORKFLOW", "Menghapus aturan otomatisasi");
    return;
  }
  await api.delete(`/workflows/${id}`);
}

export async function moveWorkflow(id: string, direction: "up" | "down"): Promise<void> {
  if (env.USE_MOCKS) return mockWorkflowStore.move(id, direction);
  await api.post(`/workflows/${id}/move`, { direction });
}
