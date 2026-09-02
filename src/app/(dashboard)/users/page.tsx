import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { UsersTable } from "@/components/users/users-table";

export const metadata: Metadata = { title: "Manajemen User" };

export default async function UsersPage() {
  const user = await getServerUser();
  if (!user) return null;

  if (user.role !== "SUPER_ADMIN" && user.role !== "COMPANY_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Manajemen User</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Daftar pengguna Secure DMS dan perannya.
        </p>
      </div>
      <UsersTable />
    </div>
  );
}
