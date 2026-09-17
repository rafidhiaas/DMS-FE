"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { loginRequest } from "@/lib/auth/client-auth";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().min(1, "Email wajib diisi.").email("Format email tidak valid."),
  password: z.string().min(1, "Password wajib diisi."),
});

type LoginValues = z.infer<typeof loginSchema>;

/**
 * Akun demo hasil `npm run seed` di backend — hanya tampil saat development.
 * Klik = isi form; login tetap lewat backend sungguhan.
 */
const IS_DEV = process.env.NODE_ENV !== "production";
const DEMO_PASSWORD = "Password123!";
const DEMO_ACCOUNTS: { role: Role; code: string; email: string }[] = [
  { role: "SUPER_ADMIN", code: "SA", email: "super@dms.test" },
  { role: "COMPANY_ADMIN", code: "CA", email: "admin@dms.test" },
  { role: "AUDITOR", code: "AU", email: "auditor@dms.test" },
  { role: "EMPLOYEE", code: "EM", email: "karyawan@dms.test" },
];

/** Form login (email + password) ke backend Express lewat BFF. */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setSubmitting(true);
    const result = await loginRequest(values.email, values.password);
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message ?? "Login gagal.");
      return;
    }
    toast.success(`Selamat datang, ${result.user?.name ?? "Pengguna"}.`);
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="email" className="eyebrow">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="nama@perusahaan.com"
          aria-invalid={!!errors.email}
          className="h-10 rounded-sm bg-card"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-[13px] text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="eyebrow">
          Kata sandi
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          className="h-10 rounded-sm bg-card"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-[13px] text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" size="lg" className="h-10 w-full rounded-sm" disabled={submitting}>
        {submitting && <Loader2 className="size-4 animate-spin" />}
        {submitting ? "Memproses…" : "Masuk"}
      </Button>

      {IS_DEV && (
        <div className="border-t border-rule pt-5">
          <p className="eyebrow">Akun demo (development)</p>
          <div className="ledger mt-2">
            {DEMO_ACCOUNTS.map(({ role, code, email }) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setValue("email", email, { shouldValidate: true });
                  setValue("password", DEMO_PASSWORD, { shouldValidate: true });
                }}
                className={cn(
                  "-mx-3 flex w-[calc(100%+1.5rem)] items-center gap-4 px-3 py-2 text-left transition-colors",
                  "hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                )}
              >
                <span className="w-7 font-mono text-[11px] tracking-[0.08em] text-muted-foreground">
                  {code}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium leading-tight">{ROLE_LABELS[role]}</span>
                  <span className="block truncate font-mono text-[12px] text-muted-foreground">{email}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-muted-foreground">
            Klik untuk mengisi form. Akun dibuat oleh <code className="font-mono">npm run seed</code> di backend.
          </p>
        </div>
      )}
    </form>
  );
}

function LoginPanel() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-10 lg:hidden">
        <span className="font-serif text-2xl leading-none">Secure DMS</span>
      </div>

      <p className="eyebrow rise">Masuk</p>
      <h1 className="display rise mt-2 text-4xl">Buka arsip Anda.</h1>
      <p className="rise-2 mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Masuk dengan akun yang diberikan administrator perusahaan Anda.
      </p>

      <div className="rise-3 mt-8">
        <LoginForm />
      </div>
    </div>
  );
}

/** Sisi kiri: pernyataan produk di atas "tinta", dengan fakta singkat sebagai kaki. */
function Statement() {
  return (
    <section className="relative hidden flex-col justify-between bg-sidebar px-12 py-10 text-sidebar-foreground lg:flex xl:px-16">
      <div>
        <span className="block font-serif text-[22px] leading-none">Secure DMS</span>
        <span className="mt-2 block font-mono text-[10.5px] uppercase tracking-[0.14em] text-sidebar-muted">
          Enterprise Document Management
        </span>
      </div>

      <div className="max-w-xl">
        <h2 className="font-serif text-[3.25rem] leading-[1.05] tracking-[-0.015em] xl:text-[3.75rem]">
          Setiap dokumen{" "}
          <em className="italic text-sidebar-primary">tercatat</em>. Setiap
          akses <em className="italic text-sidebar-primary">terjejak</em>.
        </h2>
        <p className="mt-6 max-w-md text-[15px] leading-relaxed text-sidebar-muted">
          Folder terstruktur, versi berkas yang tak pernah hilang, dan jejak
          audit untuk setiap tindakan pengguna di perusahaan Anda.
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-6 border-t border-sidebar-border pt-6">
        {[
          ["Versi", "Riwayat penuh"],
          ["Akses", "Empat peran"],
          ["Audit", "Semua aksi"],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-sidebar-muted">
              {k}
            </dt>
            <dd className="mt-1 font-serif text-lg">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen flex-1 lg:grid-cols-[1.05fr_1fr]">
      <Statement />
      <section className="flex items-center justify-center px-6 py-14 sm:px-10">
        <Suspense fallback={null}>
          <LoginPanel />
        </Suspense>
      </section>
    </main>
  );
}
