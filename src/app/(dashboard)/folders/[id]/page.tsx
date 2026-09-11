import { getServerUser } from "@/lib/auth/session";
import { FolderBrowser } from "@/components/folders/folder-browser";

export default async function FolderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const { view } = await searchParams;
  const user = await getServerUser();
  if (!user) return null;
  // key: reset state daftar (filter, seleksi) saat berpindah folder atau Tampilan Tersimpan.
  return <FolderBrowser key={`${id}:${view ?? ""}`} folderId={id} role={user.role} />;
}
