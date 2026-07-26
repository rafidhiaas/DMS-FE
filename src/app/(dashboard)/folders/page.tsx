import type { Metadata } from "next";
import { getServerUser } from "@/lib/auth/session";
import { FolderBrowser } from "@/components/folders/folder-browser";

export const metadata: Metadata = { title: "Folder & Dokumen" };

export default async function FoldersRootPage() {
  const user = await getServerUser();
  if (!user) return null;
  return <FolderBrowser folderId="root" role={user.role} />;
}
