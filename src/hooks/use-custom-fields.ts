"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as fieldsApi from "@/lib/api/custom-fields";
import type { CustomFieldInput } from "@/types";

export const customFieldKeys = { list: ["custom-fields"] as const };

export function useCustomFields(enabled = true) {
  return useQuery({
    queryKey: customFieldKeys.list,
    queryFn: fieldsApi.fetchCustomFields,
    enabled,
    staleTime: 30_000,
  });
}

function useInvalidateFields() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: customFieldKeys.list });
    qc.invalidateQueries({ queryKey: ["document"] });
    qc.invalidateQueries({ queryKey: ["folder-contents"] });
    qc.invalidateQueries({ queryKey: ["all-documents"] });
  };
}

export function useCreateCustomField() {
  const invalidate = useInvalidateFields();
  return useMutation({ mutationFn: (input: CustomFieldInput) => fieldsApi.createCustomField(input), onSuccess: invalidate });
}

export function useUpdateCustomField() {
  const invalidate = useInvalidateFields();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Partial<CustomFieldInput>) => fieldsApi.updateCustomField(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteCustomField() {
  const invalidate = useInvalidateFields();
  return useMutation({ mutationFn: (id: string) => fieldsApi.deleteCustomField(id), onSuccess: invalidate });
}
