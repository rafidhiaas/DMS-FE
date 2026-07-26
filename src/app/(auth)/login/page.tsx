"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Loader2,
  ShieldCheck,
  Crown,
  Building2,
  ClipboardCheck,
  User,
  type LucideIcon,
} from "lucide-react";
import { loginRequest, mockLoginRequest } from "@/lib/auth/client-auth";
import { ROLE_LABELS } from "@/lib/constants";
import type { Role } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

const loginSchema = z.object({
  email: z.string().min(1, "Email wajib diisi.").email("Format email tidak valid."),
  password: z.string().min(1, "Password wajib diisi."),
});

type LoginValues = z.infer<typeof loginSchema>;

/** Panel login cepat per-peran (mode demo tanpa backend). */
const MOCK_ROLES: { role: Role; icon: LucideIcon; desc: string }[] = [
  { role: "SUPER_ADMIN", icon: Crown, desc: "Akses global penuh ke seluruh sistem." },
  { role: "COMPANY_ADMIN", icon: Building2, desc: "Kelola dokumen & pengguna perusahaan." },
  { role: "AUDITOR", icon: ClipboardCheck, desc: "Akses baca-saja & audit log." },
  { role: "EMPLOYEE", icon: User, desc: "Dokumen milik sendiri & yang dibagikan." },
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
    <div className="space-y-2">
      {MOCK_ROLES.map(({ role, icon: Icon, desc }) => (
        <button
          key={role}
          type="button"
          onClick={() => pick(role)}
          disabled={loadingRole !== null}
          className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent disabled:opacity-60"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            {loadingRole === role ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Icon className="size-4" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium">{ROLE_LABELS[role]}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {desc}
            </span>
          </span>
        </button>
      ))}
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="nama@perusahaan.com"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="size-4 animate-spin" />}
        {submitting ? "Memproses..." : "Masuk"}
      </Button>
    </form>
  );
}

function LoginCard() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1">
        <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="size-6" />
        </div>
        <CardTitle className="text-2xl">Masuk ke Secure DMS</CardTitle>
        <CardDescription>
          {USE_MOCKS
            ? "Mode demo aktif — pilih peran untuk masuk cepat tanpa backend."
            : "Kelola dokumen enterprise Anda secara aman."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {USE_MOCKS ? (
          <>
            <MockLoginPanel />
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">
                atau login backend
              </span>
              <Separator className="flex-1" />
            </div>
            <RealLoginForm />
            <p className="text-center text-xs text-muted-foreground">
              Login email memerlukan backend Express + database aktif.
            </p>
          </>
        ) : (
          <RealLoginForm />
        )}
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-muted/40 px-4 py-10">
      <Suspense fallback={null}>
        <LoginCard />
      </Suspense>
    </main>
  );
}
