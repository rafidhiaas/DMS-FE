"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as workflowsApi from "@/lib/api/workflows";
import type { WorkflowRuleInput } from "@/types";

export const workflowKeys = { list: ["workflows"] as const };

export function useWorkflows() {
  return useQuery({ queryKey: workflowKeys.list, queryFn: workflowsApi.fetchWorkflows });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: workflowKeys.list });
}

export function useCreateWorkflow() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (input: WorkflowRuleInput) => workflowsApi.createWorkflow(input), onSuccess: invalidate });
}

export function useUpdateWorkflow() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Partial<WorkflowRuleInput>) => workflowsApi.updateWorkflow(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteWorkflow() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => workflowsApi.deleteWorkflow(id), onSuccess: invalidate });
}

export function useMoveWorkflow() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: "up" | "down" }) => workflowsApi.moveWorkflow(id, direction),
    onSuccess: invalidate,
  });
}
