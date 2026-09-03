import { cn } from "@/lib/utils";

/**
 * Kepala halaman: eyebrow mono kecil, judul serif, deskripsi, dan aksi di kanan.
 * Ditutup garis tipis supaya tiap halaman punya "garis kop" yang sama.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  below,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Slot di bawah judul (mis. breadcrumb). */
  below?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("rise border-b border-rule pb-5", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0 max-w-2xl">
          {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
          <h1 className="display text-[2rem] leading-none sm:text-[2.5rem]">{title}</h1>
          {description && (
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {below && <div className="mt-4">{below}</div>}
    </header>
  );
}

/** Judul seksi kecil di dalam halaman (bukan kartu). */
export function SectionHeader({
  title,
  meta,
  action,
  className,
}: {
  title: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 border-b border-rule pb-2",
        className,
      )}
    >
      <div className="flex items-baseline gap-3">
        <h2 className="eyebrow text-foreground">{title}</h2>
        {meta && <span className="font-mono text-[11px] text-muted-foreground">{meta}</span>}
      </div>
      {action}
    </div>
  );
}
