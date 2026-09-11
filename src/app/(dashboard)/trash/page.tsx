import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/session";
import { TrashView } from "@/components/trash/trash-view";

/** Sampah hanya untuk peran yang boleh menghapus dokumen (admin). */
export default async function TrashPage() {
  const user = await getServerUser();
  if (!user) return null;
  if (user.role !== "SUPER_ADMIN" && user.role !== "COMPANY_ADMIN") redirect("/dashboard");
  return <TrashView />;
}
