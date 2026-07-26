import { getServerUser } from "@/lib/auth/session";
import { DocumentDetail } from "@/components/folders/document-detail";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getServerUser();
  if (!user) return null;
  return <DocumentDetail documentId={id} role={user.role} />;
}
