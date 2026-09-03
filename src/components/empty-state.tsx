import { cn } from "@/lib/utils";

/**
 * Keadaan kosong / error yang tenang: rata kiri, satu kalimat, satu aksi.
 * Bukan ikon besar di tengah kotak putus-putus.
 */
export function EmptyState({
  title,
  description,
  action,
  tone = "muted",
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: "muted" | "destructive";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 border-y border-rule py-6",
        tone === "destructive" && "border-destructive/30 text-destructive",
        className,
      )}
    >
      <div className="max-w-prose">
        <p className="font-serif text-lg leading-snug">{title}</p>
        {description && (
          <p
            className={cn(
              "mt-1 text-sm",
              tone === "destructive" ? "text-destructive/80" : "text-muted-foreground",
            )}
          >
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
