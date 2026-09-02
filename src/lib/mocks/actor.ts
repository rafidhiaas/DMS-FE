import type { AuthUser } from "@/types";
import { MOCK_ACCOUNTS } from "@/lib/mocks/auth";

/**
 * MOCK — "actor" adalah user yang sedang login, dipakai mock store untuk
 * menandai siapa pelaku aktivitas (audit log, uploaded_by, dsb).
 * Di backend asli identitas diambil dari JWT; di mock kita set dari layout
 * dashboard (server → <MockActor user={...} /> → setMockActor).
 */
let currentActor: AuthUser | null = null;

export function setMockActor(user: AuthUser): void {
  currentActor = user;
}

export function getMockActor(): AuthUser {
  return currentActor ?? MOCK_ACCOUNTS.EMPLOYEE;
}
