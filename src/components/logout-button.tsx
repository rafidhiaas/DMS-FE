"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { logoutRequest } from "@/lib/auth/client-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function LogoutButton({
  tone = "default",
  iconOnly = false,
}: {
  tone?: "default" | "sidebar";
  /** Hanya ikon (sidebar ramping). */
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await logoutRequest();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      disabled={loading}
      aria-label="Keluar"
      title={iconOnly ? "Keluar" : undefined}
      className={cn(
        iconOnly && "size-9 px-0",
        tone === "sidebar" &&
          "h-7 px-2 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground",
      )}
    >
      {loading ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <LogOut className="size-3.5" />
      )}
      {!iconOnly && "Keluar"}
    </Button>
  );
}
