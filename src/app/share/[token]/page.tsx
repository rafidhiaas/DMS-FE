import type { Metadata } from "next";
import Link from "next/link";
import { PublicShareView } from "@/components/shares/public-share-view";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = { title: "Dokumen Dibagikan" };

/**
 * Halaman publik tautan berbagi (spec: app/share/[token]) — di luar grup
 * (dashboard) sehingga tidak dijaga proxy dan tidak butuh sesi login.
 */
export default async function PublicSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-8 md:px-8 md:py-12">
      <header className="mb-8 flex items-baseline justify-between gap-4">
        <div>
          <span className="block font-serif text-[22px] leading-none">Secure DMS</span>
          <span className="mt-2 block font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
            Dokumen dibagikan lewat tautan publik
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            Masuk
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1">
        <PublicShareView token={token} />
      </main>
    </div>
  );
}
