"use client";

import { useEffect } from "react";
import type { AuthUser } from "@/types";
import { setMockActor } from "@/lib/mocks/actor";

/**
 * MOCK — meneruskan user login (dari server) ke module actor mock,
 * agar mock store tahu siapa pelaku aktivitas. Tidak merender apa pun.
 */
export function MockActor({ user }: { user: AuthUser }) {
  useEffect(() => {
    setMockActor(user);
  }, [user]);
  return null;
}
