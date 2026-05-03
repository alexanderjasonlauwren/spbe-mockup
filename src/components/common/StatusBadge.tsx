import { cn } from "@/lib/utils";

type StatusVariant =
  | "success"
  | "warning"
  | "danger"
  | "draft"
  | "info"
  | "process";

interface StatusBadgeProps {
  variant: StatusVariant;
  label: string;
  className?: string;
}

const variantClasses: Record<StatusVariant, string> = {
  success:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  danger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  draft: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  process: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide",
        variantClasses[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}

export function getStatusVariant(status: string): StatusVariant {
  const map: Record<string, StatusVariant> = {
    Selesai: "success",
    selesai: "success",
    Aktif: "success",
    aktif: "success",
    Terkonfirmasi: "success",
    terkonfirmasi: "success",
    Terverifikasi: "success",
    terverifikasi: "success",
    Lunas: "success",

    "Dalam Pengiriman": "process",
    "Dalam Proses": "process",
    "dalam proses": "process",
    Perjalanan: "process",
    perjalanan: "process",
    Proses: "process",
    proses: "process",
    Loading: "warning",
    loading: "warning",
    Antrian: "warning",
    antrian: "warning",
    Limit: "warning",

    Tertunda: "danger",
    tertunda: "danger",
    Pending: "danger",
    pending: "danger",
    Menunggu: "warning",
    menunggu: "warning",
    Ditolak: "danger",
    ditolak: "danger",
    "Belum Lunas": "danger",
    Belum: "danger",

    Draft: "draft",
    draft: "draft",

    Info: "info",
  };
  return map[status] ?? "draft";
}
