"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as usersApi from "@/lib/api/users";
import type { Role } from "@/types";

export const userKeys = {
  list: (query: string, includeInactive: boolean) => ["users", { query, includeInactive }] as const,
};

/** Daftar pengguna lengkap (halaman Manajemen User — admin). */
export function useUsers(query = "", includeInactive = false) {
  return useQuery({
    queryKey: userKeys.list(query, includeInactive),
    queryFn: () => usersApi.fetchUsers(query, includeInactive),
  });
}

/** Kandidat penerima share — tersedia untuk semua peran (field minimal). */
export function useUserSearch(query = "", enabled = true) {
  return useQuery({
    queryKey: ["users", "search", query] as const,
    queryFn: () => usersApi.searchUsers(query),
    enabled,
  });
}

function useInvalidateUsers() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["users"] });
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (input: { name: string; email: string; role: Role; password: string }) =>
      usersApi.createUser(input),
    onSuccess: invalidate,
  });
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; name?: string; role?: Role; active?: boolean }) =>
      usersApi.updateUser(id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: invalidate,
  });
}
