"use client";

import { useQuery } from "@tanstack/react-query";
import * as usersApi from "@/lib/api/users";

export function useUsers(query = "") {
  return useQuery({
    queryKey: ["users", query] as const,
    queryFn: () => usersApi.fetchUsers(query),
  });
}
