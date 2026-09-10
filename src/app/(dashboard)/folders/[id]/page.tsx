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
  // key: reset state daftar (filter, seleksi) saat berpindah folder.
  return <FolderBrowser key={id} folderId={id} role={user.role} />;
}
