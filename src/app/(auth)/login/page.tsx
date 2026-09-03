"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import { loginRequest, mockLoginRequest } from "@/lib/auth/client-auth";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

const loginSchema = z.object({
  email: z.string().min(1, "Email wajib diisi.").email("Format email tidak valid."),
  password: z.string().min(1, "Password wajib diisi."),
});

type LoginValues = z.infer<typeof loginSchema>;

/** Panel login cepat per-peran (mode demo tanpa backend). */
const MOCK_ROLES: { role: Role; code: string; desc: string }[] = [
  { role: "SUPER_ADMIN", code: "SA", desc: "Akses global penuh ke seluruh sistem." },
  { role: "COMPANY_ADMIN", code: "CA", desc: "Kelola dokumen & pengguna perusahaan." },
  { role: "AUDITOR", code: "AU", desc: "Baca-saja, plus audit log." },
  { role: "EMPLOYEE", code: "EM", desc: "Dokumen sendiri & yang dibagikan." },
];

function MockLoginPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [loadingRole, setLoadingRole] = useState<Role | null>(null);

  async function pick(role: Role) {
    setLoadingRole(role);
    const result = await mockLoginRequest(role);
    if (!result.ok) {
      setLoadingRole(null);
      toast.error(result.message ?? "Gagal masuk.");
      return;
    }
    toast.success(`Masuk sebagai ${ROLE_LABELS[role]}.`);
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="ledger border-y border-rule">
      {MOCK_ROLES.map(({ role, code, desc }) => {
        const busy = loadingRole === role;
        return (
          <button
            key={role}
            type="button"
            onClick={() => pick(role)}
            disabled={loadingRole !== null}
            className={cn(
              "group -mx-3 flex w-[calc(100%+1.5rem)] items-center gap-4 px-3 py-3 text-left transition-colors",
              "hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:opacity-60",
            )}
          >
            <span className="w-7 font-mono text-[11px] tracking-[0.08em] text-muted-foreground">
              {code}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium leading-tight">
                {ROLE_LABELS[role]}
              </span>
              <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                {desc}
              </span>
            </span>
            {busy ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Form login nyata (email + password) — memerlukan backend Express aktif. */
function RealLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
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
      <h1 className="display rise mt-2 text-4xl">
        {USE_MOCKS ? "Pilih peran untuk mencoba." : "Buka arsip Anda."}
      </h1>
      <p className="rise-2 mt-3 text-[15px] leading-relaxed text-muted-foreground">
        {USE_MOCKS
          ? "Mode demo aktif. Tiap peran membuka menu dan hak akses yang berbeda."
          : "Masuk dengan akun yang diberikan administrator perusahaan Anda."}
      </p>

      <div className="rise-3 mt-8 space-y-8">
        {USE_MOCKS ? (
          <>
            <MockLoginPanel />
            <details className="group">
              <summary className="eyebrow cursor-pointer list-none select-none hover:text-foreground">
                <span className="group-open:hidden">Atau masuk dengan akun backend ↓</span>
                <span className="hidden group-open:inline">Masuk dengan akun backend</span>
              </summary>
              <div className="mt-4">
                <RealLoginForm />
                <p className="mt-3 text-[12px] text-muted-foreground">
                  Memerlukan backend Express dan database aktif.
                </p>
              </div>
            </details>
          </>
        ) : (
          <RealLoginForm />
        )}
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
