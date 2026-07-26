import {
  FileText,
  FileSpreadsheet,
  FileImage,
  FileType,
  File,
  type LucideProps,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAP: Record<
  string,
  { Icon: React.ComponentType<LucideProps>; color: string }
> = {
  pdf: { Icon: FileText, color: "text-red-600 dark:text-red-400" },
  docx: { Icon: FileText, color: "text-blue-600 dark:text-blue-400" },
  txt: { Icon: FileText, color: "text-slate-500" },
  xlsx: { Icon: FileSpreadsheet, color: "text-emerald-600 dark:text-emerald-400" },
  csv: { Icon: FileSpreadsheet, color: "text-emerald-600 dark:text-emerald-400" },
  pptx: { Icon: FileType, color: "text-orange-600 dark:text-orange-400" },
  png: { Icon: FileImage, color: "text-violet-600 dark:text-violet-400" },
  jpg: { Icon: FileImage, color: "text-violet-600 dark:text-violet-400" },
  jpeg: { Icon: FileImage, color: "text-violet-600 dark:text-violet-400" },
};

export function FileIcon({
  extension,
  className,
}: {
  extension: string;
  className?: string;
}) {
  const entry = MAP[extension.toLowerCase()] ?? { Icon: File, color: "text-muted-foreground" };
  const { Icon, color } = entry;
  return <Icon className={cn("size-5", color, className)} />;
}
