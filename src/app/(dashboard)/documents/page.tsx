import type { Metadata } from "next";
import { getServerUser } from "@/lib/auth/session";
import { AllDocuments } from "@/components/documents/all-documents";

export const metadata: Metadata = { title: "Semua Dokumen" };

export default async function AllDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const user = await getServerUser();
  if (!user) return null;
  return <AllDocuments key={view ?? ""} role={user.role} />;
}
