import React from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatsCard } from "@/components/common/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CanAccess } from "@/features/rbac/components/CanAccess";
import { PERMISSIONS } from "@/features/rbac/permissions";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Package,
  CreditCard,
  MapPin,
  Bell,
  ArrowRight,
  Truck,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";

interface TooltipPayloadItem {
  value: number | string;
  name: string;
  color: string;
}

const getStatusBadge = (status: string) => {
  const statusConfig: Record<
    string,
    { label: string; icon: React.ElementType; className: string }
  > = {
    terkirim: {
      label: "Terkirim",
      icon: CheckCircle2,
      className:
        "bg-green-100 text-green-700 border-green-300 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30",
    },
    proses: {
      label: "Dalam Proses",
      icon: Clock,
      className:
        "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30",
    },
    terjadwal: {
      label: "Terjadwal",
      icon: Clock,
      className:
        "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/30",
    },
  };

  const config = statusConfig[status] ?? statusConfig["terjadwal"];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium capitalize flex items-center gap-1.5 w-fit px-2.5 py-0.5",
        config.className,
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

// Mock data - LPG distribution context
const dailyDistribusiData = [
  { hari: "Sen", distribusi: 420, target: 440 },
  { hari: "Sel", distribusi: 452, target: 440 },
  { hari: "Rab", distribusi: 387, target: 440 },
  { hari: "Kam", distribusi: 465, target: 440 },
  { hari: "Jum", distribusi: 501, target: 440 },
  { hari: "Sab", distribusi: 398, target: 440 },
  { hari: "Min", distribusi: 487, target: 440 },
];

const pangkalanData = [
  { pangkalan: "UD Maju Jaya", distribusi: 1240 },
  { pangkalan: "Toko Berkah", distribusi: 980 },
  { pangkalan: "CV Sejahtera", distribusi: 870 },
  { pangkalan: "Kios Makmur", distribusi: 760 },
  { pangkalan: "UD Harapan", distribusi: 690 },
];

const recentDistribusi = [
  {
    id: "SJ-2026-0342",
    pangkalan: "UD Maju Jaya",
    driver: "Budi Santoso",
    jumlah: 120,
    status: "terkirim",
    tanggal: "26 Mar 2026",
  },
  {
    id: "SJ-2026-0341",
    pangkalan: "Toko Berkah",
    driver: "Hendra Wijaya",
    jumlah: 80,
    status: "proses",
    tanggal: "26 Mar 2026",
  },
  {
    id: "SJ-2026-0340",
    pangkalan: "CV Sejahtera",
    driver: "Ahmad Yani",
    jumlah: 100,
    status: "terjadwal",
    tanggal: "26 Mar 2026",
  },
  {
    id: "SJ-2026-0339",
    pangkalan: "Kios Makmur",
    driver: "Budi Santoso",
    jumlah: 60,
    status: "terkirim",
    tanggal: "25 Mar 2026",
  },
  {
    id: "SJ-2026-0338",
    pangkalan: "UD Harapan",
    driver: "Slamet Riyadi",
    jumlah: 90,
    status: "terkirim",
    tanggal: "25 Mar 2026",
  },
];

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-dark-800 p-3 rounded-lg shadow-xl border border-gray-200 dark:border-dark-600">
        <p className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
          {label}
        </p>
        {payload.map((item, index: number) => (
          <p key={index} className="text-xs" style={{ color: item.color }}>
            {item.name}:{" "}
            {typeof item.value === "number"
              ? `${item.value.toLocaleString("id-ID")} tabung`
              : item.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const PangkalanTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-dark-800 p-3 rounded-lg shadow-xl border border-gray-200 dark:border-dark-600">
        <p className="font-semibold text-gray-900 dark:text-white mb-1 text-xs">
          {label}
        </p>
        {payload.map((item, index: number) => (
          <p key={index} className="text-xs" style={{ color: item.color }}>
            {typeof item.value === "number"
              ? `${item.value.toLocaleString("id-ID")} tabung`
              : item.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Progress bar component
function QuotaProgress({
  used,
  total,
}: {
  used: number;
  total: number;
}) {
  const pct = Math.round((used / total) * 100);
  const isLow = pct >= 90;
  const isMedium = pct >= 70 && pct < 90;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600 dark:text-gray-400">
          {used.toLocaleString("id-ID")} / {total.toLocaleString("id-ID")} tabung
        </span>
        <span
          className={cn(
            "font-semibold",
            isLow
              ? "text-red-600 dark:text-red-400"
              : isMedium
                ? "text-yellow-600 dark:text-yellow-400"
                : "text-green-600 dark:text-green-400",
          )}
        >
          {pct}%
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-2">
        <div
          className={cn(
            "h-2 rounded-full transition-all",
            isLow
              ? "bg-red-500"
              : isMedium
                ? "bg-yellow-500"
                : "bg-green-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const sisaKuota = 1240;
  const totalKuota = 15420;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Dashboard Operasional"
        description="Ringkasan distribusi LPG hari ini dan kinerja bulan berjalan."
        actions={
          <CanAccess permission={PERMISSIONS.REPORTS_VIEW}>
            <Button
              variant="outline"
              className="gap-2 border-gray-300 dark:border-dark-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-800"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export Laporan</span>
            </Button>
          </CanAccess>
        }
      />

      {/* Alert Banners */}
      <div className="space-y-3">
        {/* Low quota alert */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">
              Kuota SA Hampir Habis
            </p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
              Sisa {sisaKuota.toLocaleString("id-ID")} tabung dari{" "}
              {totalKuota.toLocaleString("id-ID")} ({Math.round((sisaKuota / totalKuota) * 100)}%). Segera hubungi SPBE untuk SA berikutnya.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 text-xs"
          >
            Lihat SA
          </Button>
        </div>

        {/* Pending payment alert */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30">
          <Bell className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
              8 Pembayaran Menunggu Verifikasi
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
              Total{" "}
              {formatCurrency(45500000)} belum diverifikasi oleh tim keuangan.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-yellow-300 dark:border-yellow-500/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-500/20 text-xs"
          >
            Verifikasi
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        <CanAccess permission={PERMISSIONS.SA_VIEW}>
          <StatsCard
            title="Target SA Bulan Ini"
            value="15.420 Tabung"
            change="SA aktif sampai 31 Mar"
            changeType="neutral"
            icon={Package}
            iconColor="text-amber-600 dark:text-amber-400"
            iconBgColor="bg-amber-50 dark:bg-amber-500/10"
            accentBg="bg-amber-500"
          />
        </CanAccess>

        <CanAccess permission={PERMISSIONS.DISTRIBUTION_VIEW}>
          <StatsCard
            title="Terdistribusi Hari Ini"
            value="487 Tabung"
            change="+10.7% dari kemarin"
            changeType="positive"
            icon={Truck}
            iconColor="text-cyan-600 dark:text-cyan-400"
            iconBgColor="bg-cyan-50 dark:bg-cyan-500/10"
            accentBg="bg-cyan-500"
          />
        </CanAccess>

        <CanAccess permission={PERMISSIONS.PAYMENTS_VIEW}>
          <StatsCard
            title="Pembayaran Pending"
            value={formatCurrency(45500000)}
            change="8 transaksi belum diverifikasi"
            changeType="negative"
            icon={CreditCard}
            iconColor="text-red-600 dark:text-red-400"
            iconBgColor="bg-red-50 dark:bg-red-500/10"
            accentBg="bg-red-500"
          />
        </CanAccess>

        <CanAccess permission={PERMISSIONS.PRODUCTS_VIEW}>
          <StatsCard
            title="Pangkalan Aktif"
            value="24 Pangkalan"
            change="+2 baru bulan ini"
            changeType="positive"
            icon={MapPin}
            iconColor="text-indigo-600 dark:text-indigo-400"
            iconBgColor="bg-indigo-50 dark:bg-indigo-500/10"
            accentBg="bg-indigo-500"
          />
        </CanAccess>
      </div>

      {/* Quota Progress + Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quota Usage Card */}
        <CanAccess permission={PERMISSIONS.SA_VIEW}>
          <div className="relative lg:col-span-1">
            <div className="absolute top-0 inset-x-0 h-0.5 bg-red-500 z-10 rounded-t-xl" />
            <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-lg h-full">
            <CardHeader className="border-b border-gray-100 dark:border-dark-700 pb-4">
              <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                Sisa Kuota SA
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Terpakai
                  </span>
                  <TrendingUp className="h-4 w-4 text-red-500" />
                </div>
                <QuotaProgress
                  used={totalKuota - sisaKuota}
                  total={totalKuota}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
                  <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                    Sisa Kuota
                  </p>
                  <p className="text-lg font-bold text-green-800 dark:text-green-300 mt-0.5">
                    {sisaKuota.toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500">
                    tabung
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                    Est. Hari
                  </p>
                  <p className="text-lg font-bold text-blue-800 dark:text-blue-300 mt-0.5">
                    ~3
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-500">
                    hari lagi
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Rincian SA Aktif
                </p>
                {[
                  { no: "SA-2026-003", vol: "8.420", sisa: "620", pct: 93 },
                  { no: "SA-2026-002", vol: "7.000", sisa: "620", pct: 91 },
                ].map((sa) => (
                  <div
                    key={sa.no}
                    className="flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {sa.no}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400">
                        Sisa {sa.sisa} / {sa.vol} tabung
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        sa.pct >= 90
                          ? "border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10"
                          : "border-yellow-300 dark:border-yellow-500/30 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10",
                      )}
                    >
                      {sa.pct}% terpakai
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          </div>
        </CanAccess>

        {/* Daily Distribution Chart */}
        <CanAccess permission={PERMISSIONS.DISTRIBUTION_VIEW}>
          <div className="relative lg:col-span-2">
            <div className="absolute top-0 inset-x-0 h-0.5 bg-cyan-500 z-10 rounded-t-xl" />
            <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-lg h-full">
            <CardHeader className="border-b border-gray-100 dark:border-dark-700 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                  Distribusi Harian (7 Hari Terakhir)
                </CardTitle>
                <Badge
                  variant="outline"
                  className="border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-dark-700 text-xs"
                >
                  Target: 440 tabung/hari
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 pb-2">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={dailyDistribusiData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    opacity={0.1}
                  />
                  <XAxis
                    dataKey="hari"
                    stroke="#9ca3af"
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    domain={[300, 600]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: "#6b7280", fontSize: 12 }} />
                  <ReferenceLine
                    y={440}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeOpacity={0.7}
                  />
                  <Line
                    type="monotone"
                    dataKey="distribusi"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    dot={{ fill: "#06b6d4", r: 4 }}
                    activeDot={{ r: 6, fill: "#0891b2" }}
                    name="Distribusi"
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    name="Target"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          </div>
        </CanAccess>
      </div>

      {/* Bottom Row: Pangkalan Chart + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pangkalan Chart */}
        <CanAccess permission={PERMISSIONS.DISTRIBUTION_VIEW}>
          <div className="relative">
            <div className="absolute top-0 inset-x-0 h-0.5 bg-violet-500 z-10 rounded-t-xl" />
            <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-lg">
            <CardHeader className="border-b border-gray-100 dark:border-dark-700 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                  Top 5 Pangkalan
                </CardTitle>
                <Badge
                  variant="outline"
                  className="border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-dark-700 text-xs"
                >
                  Bulan Ini
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 pb-2">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={pangkalanData} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    opacity={0.1}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    stroke="#9ca3af"
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="pangkalan"
                    stroke="#9ca3af"
                    tick={{ fill: "#6b7280", fontSize: 10 }}
                    width={80}
                  />
                  <Tooltip content={<PangkalanTooltip />} />
                  <Bar
                    dataKey="distribusi"
                    fill="#6366f1"
                    radius={[0, 6, 6, 0]}
                    name="Tabung"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          </div>
        </CanAccess>

        {/* Recent Distribution Activity */}
        <CanAccess permission={PERMISSIONS.DISTRIBUTION_VIEW}>
          <div className="relative">
            <div className="absolute top-0 inset-x-0 h-0.5 bg-emerald-500 z-10 rounded-t-xl" />
            <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 dark:border-dark-700 pb-4">
              <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                Aktivitas Distribusi Terkini
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 gap-1 text-xs"
              >
                Lihat Semua
                <ArrowRight className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100 dark:divide-dark-700">
                {recentDistribusi.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center shrink-0">
                      <Truck className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                          {item.id}
                        </p>
                        {getStatusBadge(item.status)}
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-300 truncate mt-0.5">
                        {item.pangkalan} • {item.driver}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {item.tanggal}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {item.jumlah}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        tabung
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          </div>
        </CanAccess>
      </div>
    </div>
  );
}
