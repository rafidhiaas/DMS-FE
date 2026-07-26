import { getServerUser } from "@/lib/auth/session";
import { FolderBrowser } from "@/components/folders/folder-browser";

export default async function FolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getServerUser();
  if (!user) return null;
  return <FolderBrowser folderId={id} role={user.role} />;
}
