import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  AlertTriangle,
  Truck,
  Wallet,
  Download,
  FileSpreadsheet,
  Search,
  Eye,
  MessageSquare,
  Filter,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ── Mock data ────────────────────────────────────────────────────────────────
const kpiData = [
  {
    label: "Total Pendapatan",
    value: 284500000,
    sub: "+12.4% vs bulan lalu",
    subType: "positive" as const,
    icon: TrendingUp,
    borderColor: "border-[#1565C0]",
    iconBg: "bg-blue-50",
    iconColor: "text-[#1565C0]",
  },
  {
    label: "Total Piutang Pangkalan",
    value: 45800000,
    sub: "12 pangkalan belum lunas",
    subType: "negative" as const,
    icon: AlertTriangle,
    borderColor: "border-red-500",
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
  },
  {
    label: "Biaya Operasional",
    value: 38200000,
    sub: "Driver + BBM + lainnya",
    subType: "neutral" as const,
    icon: Truck,
    borderColor: "border-amber-500",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    label: "Laba Bersih Estimasi",
    value: 246300000,
    sub: "Margin 86.6%",
    subType: "positive" as const,
    icon: Wallet,
    borderColor: "border-emerald-500",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
];

const monthlyData = [
  { bulan: "Des", pendapatan: 198000000, pengeluaran: 49000000 },
  { bulan: "Jan", pendapatan: 215000000, pengeluaran: 41000000 },
  { bulan: "Feb", pendapatan: 187000000, pengeluaran: 57000000 },
  { bulan: "Mar", pendapatan: 251000000, pengeluaran: 36000000 },
  { bulan: "Apr", pendapatan: 228000000, pengeluaran: 48000000 },
  { bulan: "Mei", pendapatan: 284500000, pengeluaran: 38200000 },
];

const komposisiData = [
  { name: "Pembayaran Pangkalan", value: 60, color: "#1565C0" },
  { name: "Margin Distribusi", value: 25, color: "#F59E0B" },
  { name: "Lain-lain", value: 15, color: "#CBD5E1" },
];

type PaymentStatus = "Lunas" | "Sebagian" | "Belum";

interface PangkalanRow {
  id: string;
  nama: string;
  totalTagihan: number;
  paidPct: number;
  transaksi: number;
  status: PaymentStatus;
}

const reconciliationData: PangkalanRow[] = [
  { id: "P1", nama: "Pangkalan Jaya Abadi", totalTagihan: 12450000, paidPct: 100, transaksi: 24, status: "Lunas" },
  { id: "P2", nama: "Agen Gas Sumber Makmur", totalTagihan: 25800000, paidPct: 60, transaksi: 42, status: "Sebagian" },
  { id: "P3", nama: "Toko Kelontong Bersama", totalTagihan: 8120000, paidPct: 0, transaksi: 15, status: "Belum" },
  { id: "P4", nama: "Pangkalan Berkah LPG", totalTagihan: 15600000, paidPct: 100, transaksi: 28, status: "Lunas" },
  { id: "P5", nama: "UD Maju Gasindo", totalTagihan: 42000000, paidPct: 100, transaksi: 56, status: "Lunas" },
  { id: "P6", nama: "Warung Gas Lestari", totalTagihan: 5400000, paidPct: 80, transaksi: 10, status: "Sebagian" },
];

// ── Sub-components ────────────────────────────────────────────────────────────
function CustomBarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-xl text-xs space-y-1">
      <p className="font-bold text-on-surface mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

function PayStatusBadge({ status }: { status: PaymentStatus }) {
  const styles: Record<PaymentStatus, string> = {
    Lunas: "bg-emerald-100 text-emerald-700",
    Sebagian: "bg-amber-100 text-amber-700",
    Belum: "bg-red-100 text-red-700",
  };
  return (
    <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-black uppercase", styles[status])}>
      {status}
    </span>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const color = pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden min-w-[60px]">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: pct + "%" }} />
      </div>
      <span className="text-xs font-bold text-on-surface tabular-nums w-8">{pct}%</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function ReportsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");

  const filtered = reconciliationData.filter((row) => {
    const matchSearch = row.nama.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "Semua" || row.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalTagihan = reconciliationData.reduce((s, r) => s + r.totalTagihan, 0);
  const totalPiutang = reconciliationData.reduce((s, r) => s + (r.totalTagihan * (100 - r.paidPct)) / 100, 0);
  const totalTransaksi = reconciliationData.reduce((s, r) => s + r.transaksi, 0);
  const avgPaid = Math.round(
    reconciliationData.reduce((s, r) => s + r.paidPct, 0) / reconciliationData.length
  );

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-on-surface">Laporan Keuangan</h1>
          <span className="text-xs font-bold text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full">
            Mei 2026
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-on-surface-variant text-sm font-semibold rounded-lg hover:bg-surface-container-low transition-all active:scale-[0.98]">
            <Download className="h-4 w-4" />
            Export PDF
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#1565C0] text-white text-sm font-semibold rounded-lg hover:bg-[#1255A0] transition-all active:scale-[0.98] shadow-sm">
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {kpiData.map((kpi) => (
          <div
            key={kpi.label}
            className={"bg-surface-container-lowest rounded-xl p-6 border-t-4 shadow-sm " + kpi.borderColor}
          >
            <div className="flex items-start justify-between mb-4">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider leading-tight pr-2">
                {kpi.label}
              </p>
              <div className={"w-9 h-9 rounded-lg flex items-center justify-center shrink-0 " + kpi.iconBg}>
                <kpi.icon className={"h-5 w-5 " + kpi.iconColor} />
              </div>
            </div>
            <p className="text-2xl font-black text-on-surface mb-2">
              {formatCurrency(kpi.value)}
            </p>
            <p
              className={
                "text-xs font-bold " +
                (kpi.subType === "positive" ? "text-emerald-600" :
                 kpi.subType === "negative" ? "text-red-600" :
                 "text-on-surface-variant")
              }
            >
              {kpi.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Bar chart */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <h3 className="text-base font-bold text-on-surface">
              Pendapatan vs Pengeluaran Bulanan
            </h3>
            <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-[#1565C0]" />
                <span className="text-on-surface-variant">Pendapatan</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-on-surface-variant">Pengeluaran</span>
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f2f4f7" vertical={false} />
              <XAxis
                dataKey="bulan"
                tick={{ fontSize: 11, fontWeight: 700, fill: "#424752" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#424752" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (v / 1000000).toFixed(0) + "jt"}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar dataKey="pendapatan" name="Pendapatan" fill="#1565C0" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut chart */}
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col">
          <h3 className="text-base font-bold text-on-surface mb-6">Komposisi Pendapatan</h3>
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="relative w-44 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={komposisiData}
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={74}
                    dataKey="value"
                    paddingAngle={2}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {komposisiData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [v + "%", ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-on-surface">100%</span>
                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                  Total
                </span>
              </div>
            </div>
            <div className="w-full space-y-3">
              {komposisiData.map((d) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-sm text-on-surface-variant">{d.name}</span>
                  </div>
                  <span className="text-sm font-bold text-on-surface">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reconciliation Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 bg-surface-container-low/40 border-b border-slate-100">
          <h3 className="text-base font-bold text-on-surface">
            Rekonsiliasi Pembayaran Pangkalan
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              {["Semua", "Lunas", "Sebagian", "Belum"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " +
                    (statusFilter === s
                      ? "bg-[#1565C0] text-white"
                      : "text-on-surface-variant hover:bg-surface-container")
                  }
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-on-surface-variant" />
              <input
                type="text"
                placeholder="Cari Pangkalan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30"
              />
            </div>
            <button className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container transition-colors">
              <Filter className="h-4 w-4 text-on-surface-variant" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low/30">
                {["Pangkalan", "Total Tagihan", "Sudah Dibayar", "Sisa Piutang", "Transaksi", "Status", "Aksi"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row) => {
                const sisaPiutang = row.totalTagihan * (1 - row.paidPct / 100);
                return (
                  <tr key={row.id} className="hover:bg-surface-container-low/20 transition-colors">
                    <td className="px-5 py-4 font-bold text-on-surface text-sm">{row.nama}</td>
                    <td className="px-5 py-4 text-right font-medium text-sm text-on-surface whitespace-nowrap">
                      {formatCurrency(row.totalTagihan)}
                    </td>
                    <td className="px-5 py-4 min-w-[140px]">
                      <ProgressBar pct={row.paidPct} />
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-sm whitespace-nowrap">
                      {sisaPiutang === 0 ? (
                        <span className="text-slate-400 font-medium">Rp 0</span>
                      ) : (
                        <span className="text-red-600">{formatCurrency(sisaPiutang)}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center font-medium text-sm">{row.transaksi}</td>
                    <td className="px-5 py-4">
                      <PayStatusBadge status={row.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          title="Lihat detail"
                          className="p-1.5 text-on-surface-variant hover:text-[#1565C0] hover:bg-blue-50 rounded-md transition-all"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          title="Kirim pesan"
                          className="p-1.5 text-on-surface-variant hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-all"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-on-surface-variant">
                    Tidak ada data yang cocok
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-surface-container-low/50 border-t-2 border-slate-200">
                <td className="px-5 py-4 text-xs font-black text-on-surface uppercase tracking-wider">
                  Total Rekonsiliasi
                </td>
                <td className="px-5 py-4 text-right font-black text-sm text-on-surface whitespace-nowrap">
                  {formatCurrency(totalTagihan)}
                </td>
                <td className="px-5 py-4">
                  <ProgressBar pct={avgPaid} />
                </td>
                <td className="px-5 py-4 text-right font-black text-sm text-red-600 whitespace-nowrap">
                  {formatCurrency(totalPiutang)}
                </td>
                <td className="px-5 py-4 text-center font-black text-sm">{totalTransaksi}</td>
                <td className="px-5 py-4" />
                <td className="px-5 py-4 text-[11px] text-on-surface-variant italic">
                  Data diperbarui otomatis per transaksi divalidasi
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
