"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tombol tema terang/gelap. Ikon dipilih lewat kelas `dark:` (bukan state)
 * supaya render server dan client identik — tanpa useEffect/setMounted.
 */
export function ThemeToggle({
  tone = "default",
  className,
}: {
  tone?: "default" | "sidebar";
  className?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      aria-label="Ganti tema terang/gelap"
      title="Ganti tema"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-sm border transition-colors",
        tone === "sidebar"
          ? "border-sidebar-border text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
          : "border-input text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </button>
  );
}
