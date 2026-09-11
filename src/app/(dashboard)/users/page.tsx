import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/page-header";
import { UsersManager } from "@/components/users/users-manager";

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
        description="Tambah pengguna, atur peran RBAC, nonaktifkan atau hapus akun."
      />
      <UsersManager actorRole={user.role} actorId={user.id} />
    </div>
  );
}
