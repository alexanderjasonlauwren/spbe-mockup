import type { LucideIcon } from "lucide-react";
import type { UserRole } from "@/types/auth";
import {
  Bell,
  BookOpen,
  ClipboardList,
  FileText,
  Fuel,
  LayoutDashboard,
  Map,
  Receipt,
  ReceiptText,
  Route,
  Settings,
  Store,
  Table2,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { outletLabel, outletLabelTitle, supplierLabel, unitLabel } from "@/lib/lexicon";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  /** One line explaining what the page is for, used in the command palette. */
  hint: string;
}

export interface NavGroup {
  /** Groups follow the working day: intake, dispatch, then money. */
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operasi harian",
    items: [
      {
        name: "Beranda",
        href: "/dashboard",
        icon: LayoutDashboard,
        hint: "Papan berangkat hari ini dan angka kunci",
      },
      {
        name: `Pesanan ${outletLabelTitle()}`,
        href: "/orders",
        icon: ClipboardList,
        hint: "Permintaan masuk yang menunggu persetujuan",
      },
      {
        name: "Schedule Agreement",
        href: "/sa",
        icon: FileText,
        hint: `Kuota dari ${supplierLabel()} dan sisa yang bisa ditarik`,
      },
      {
        name: "Perencanaan Distribusi",
        href: "/distribution",
        icon: Truck,
        hint: "Susun rute, tetapkan armada, konfirmasi rencana",
      },
      {
        name: "Monitoring Distribusi",
        href: "/monitoring",
        icon: Map,
        hint: "Posisi armada dan status tiap surat jalan",
      },
    ],
  },
  {
    label: "Keuangan",
    items: [
      {
        name: "OCR Kwitansi",
        href: "/ocr",
        icon: Receipt,
        hint: "Pindai bukti bayar dan terbitkan tagihan",
      },
      {
        name: "Piutang",
        href: "/receivables",
        icon: ReceiptText,
        hint: "Umur piutang, tagihan, dan nota kredit",
      },
      {
        name: "Penerimaan Kas",
        href: "/payments",
        icon: Wallet,
        hint: "Uang masuk dan alokasinya ke tagihan",
      },
      {
        name: "Buku Besar",
        href: "/ledger",
        icon: BookOpen,
        hint: "Jurnal, neraca saldo, dan laba rugi",
      },
      {
        name: "Laporan",
        href: "/reports",
        icon: FileText,
        hint: "Rekap distribusi dan pendapatan per periode",
      },
      {
        name: "Rekap Transaksi",
        href: "/transactions",
        icon: Table2,
        hint: "Daftar seluruh transaksi, disaring dan diekspor ke Excel",
      },
    ],
  },
  {
    label: "Data induk",
    items: [
      {
        name: outletLabelTitle(),
        href: "/outlet",
        icon: Store,
        hint: `Daftar ${outletLabel()}, kuota, dan penanggung jawab`,
      },
      {
        name: "Armada & Driver",
        href: "/drivers",
        icon: Truck,
        hint: "Kendaraan, kapasitas, dan kinerja pengemudi",
      },
      {
        name: "Produk",
        href: "/products",
        icon: Fuel,
        hint: `Katalog ${unitLabel()}, harga, dan stok gudang`,
      },
      {
        name: "Pengguna & Akses",
        href: "/users",
        icon: Users,
        hint: "Akun tim dan jejak aktivitas sistem",
      },
    ],
  },
];

/**
 * The sopir's console.
 *
 * A separate tree rather than a filtered one: a driver does not need a smaller
 * version of the dispatcher's menu, they need a different menu. Hiding twenty
 * items they can never use would still leave the console shaped like somebody
 * else's job.
 */
export const DRIVER_NAV_GROUPS: NavGroup[] = [
  {
    label: "Tugas saya",
    items: [
      {
        name: "Rute Saya",
        href: "/sopir",
        icon: Route,
        hint: "Pemberhentian hari ini dan pencatatan penerimaan",
      },
    ],
  },
];

export const BOTTOM_NAV: NavItem[] = [
  {
    name: "Notifikasi",
    href: "/notifications",
    icon: Bell,
    hint: "Peringatan kuota, keterlambatan, dan tagihan",
  },
  {
    name: "Pengaturan",
    href: "/settings",
    icon: Settings,
    hint: "Profil agen, harga, pengingat, dan data",
  },
];

/** Every group in the application, whichever console it belongs to. */
export const ALL_NAV_GROUPS: NavGroup[] = [...NAV_GROUPS, ...DRIVER_NAV_GROUPS];

export const ALL_NAV_ITEMS: NavItem[] = [
  ...ALL_NAV_GROUPS.flatMap((g) => g.items),
  ...BOTTOM_NAV,
];

/** The menu this role actually works from. */
export function navGroupsFor(role?: UserRole): NavGroup[] {
  return role === "driver" ? DRIVER_NAV_GROUPS : NAV_GROUPS;
}

/**
 * Where a role belongs after signing in.
 *
 * A sopir landing on the dashboard would open the console on a dispatch rail of
 * trucks that are not theirs, with their own run two taps away.
 */
export function landingPathFor(role?: UserRole): string {
  return role === "driver" ? "/sopir" : "/dashboard";
}

/** Title shown in the header for a given path. */
export function titleFor(pathname: string): string {
  const exact = ALL_NAV_ITEMS.find((i) => i.href === pathname);
  if (exact) return exact.name;
  const prefix = ALL_NAV_ITEMS.filter((i) => pathname.startsWith(`${i.href}/`)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
  return prefix?.name ?? "SiDistrib";
}

/** The group a path belongs to, used as the header eyebrow. */
export function sectionFor(pathname: string): string | undefined {
  return ALL_NAV_GROUPS.find((g) =>
    g.items.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`)),
  )?.label;
}
