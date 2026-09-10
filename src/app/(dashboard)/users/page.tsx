import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
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
      <PageHeader
        eyebrow="Administrasi"
        title="Manajemen User"
        description="Daftar pengguna Secure DMS dan perannya."
      />
      <UsersTable />
    </div>
  );
}
