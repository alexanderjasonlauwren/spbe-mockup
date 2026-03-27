import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatsCard } from "@/components/common/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CanAccess } from "@/features/rbac/components/CanAccess";
import { PERMISSIONS } from "@/features/rbac/permissions";
import { cn } from "@/lib/utils";
import {
  FileText,
  Upload,
  Search,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Package,
  TrendingUp,
  Calendar,
  Download,
  RefreshCw,
} from "lucide-react";

interface SARecord {
  id: string;
  noSA: string;
  periode: string;
  tanggalMulai: string;
  tanggalAkhir: string;
  volumeTotal: number;
  volumeTerdistribusi: number;
  volumeSisa: number;
  targetHarian: number;
  status: "aktif" | "hampir_habis" | "habis" | "belum_aktif";
  source: string;
}

const mockSAData: SARecord[] = [
  {
    id: "1",
    noSA: "SA-2026-003",
    periode: "Maret 2026 (Minggu 4)",
    tanggalMulai: "24 Mar 2026",
    tanggalAkhir: "31 Mar 2026",
    volumeTotal: 8420,
    volumeTerdistribusi: 7800,
    volumeSisa: 620,
    targetHarian: 1050,
    status: "hampir_habis",
    source: "SPBE Pertamina Pusat",
  },
  {
    id: "2",
    noSA: "SA-2026-002",
    periode: "Maret 2026 (Minggu 1-3)",
    tanggalMulai: "1 Mar 2026",
    tanggalAkhir: "23 Mar 2026",
    volumeTotal: 7000,
    volumeTerdistribusi: 6380,
    volumeSisa: 620,
    targetHarian: 320,
    status: "hampir_habis",
    source: "SPBE Pertamina Pusat",
  },
  {
    id: "3",
    noSA: "SA-2026-001",
    periode: "Februari 2026",
    tanggalMulai: "1 Feb 2026",
    tanggalAkhir: "28 Feb 2026",
    volumeTotal: 13800,
    volumeTerdistribusi: 13800,
    volumeSisa: 0,
    targetHarian: 493,
    status: "habis",
    source: "SPBE Pertamina Pusat",
  },
  {
    id: "4",
    noSA: "SA-2025-012",
    periode: "Januari 2026",
    tanggalMulai: "1 Jan 2026",
    tanggalAkhir: "31 Jan 2026",
    volumeTotal: 14260,
    volumeTerdistribusi: 14260,
    volumeSisa: 0,
    targetHarian: 460,
    status: "habis",
    source: "SPBE Pertamina Pusat",
  },
];

const statusConfig = {
  aktif: {
    label: "Aktif",
    className:
      "bg-green-100 text-green-700 border-green-300 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30",
    icon: CheckCircle2,
  },
  hampir_habis: {
    label: "Hampir Habis",
    className:
      "bg-red-100 text-red-700 border-red-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30",
    icon: AlertTriangle,
  },
  habis: {
    label: "Habis",
    className:
      "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/30",
    icon: Package,
  },
  belum_aktif: {
    label: "Belum Aktif",
    className:
      "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30",
    icon: Calendar,
  },
};

function ProgressBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  const isLow = pct >= 90;
  const isMedium = pct >= 70;

  return (
    <div className="space-y-1">
      <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-1.5">
        <div
          className={cn(
            "h-1.5 rounded-full transition-all",
            isLow ? "bg-red-500" : isMedium ? "bg-yellow-500" : "bg-green-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {used.toLocaleString("id-ID")} / {total.toLocaleString("id-ID")} ({pct}%)
      </p>
    </div>
  );
}

export function SAManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  };

  const filtered = mockSAData.filter((sa) => {
    const matchesSearch =
      sa.noSA.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sa.periode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || sa.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalVolume = mockSAData.reduce((s, r) => s + r.volumeTotal, 0);
  const totalTerdistribusi = mockSAData.reduce(
    (s, r) => s + r.volumeTerdistribusi,
    0,
  );
  const totalSisa = mockSAData.reduce((s, r) => s + r.volumeSisa, 0);
  const saAktif = mockSAData.filter(
    (r) => r.status === "aktif" || r.status === "hampir_habis",
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule Agreement (SA)"
        description="Kelola dan pantau Schedule Agreement dari SPBE untuk distribusi LPG."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2 border-gray-300 dark:border-dark-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-800"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Sync SPBE</span>
            </Button>
            <CanAccess permission={PERMISSIONS.SA_IMPORT}>
              <Button className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/30">
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import SA</span>
              </Button>
            </CanAccess>
          </div>
        }
      />

      {/* Alert Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            SA Bulan April 2026 Belum Diunduh
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            Jadwal distribusi April belum tersedia. Unduh SA terbaru dari portal SPBE sebelum 31 Maret 2026.
          </p>
        </div>
        <Button
          size="sm"
          className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1"
        >
          <Download className="h-3 w-3" />
          Unduh SA
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="SA Aktif"
          value={`${saAktif} SA`}
          change="2 SA sedang berjalan"
          changeType="neutral"
          icon={FileText}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBgColor="bg-amber-50 dark:bg-amber-500/10"
        />
        <StatsCard
          title="Total Volume"
          value={`${totalVolume.toLocaleString("id-ID")} Tabung`}
          change="Akumulasi semua SA"
          changeType="neutral"
          icon={Package}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBgColor="bg-blue-50 dark:bg-blue-500/10"
        />
        <StatsCard
          title="Terdistribusi"
          value={`${totalTerdistribusi.toLocaleString("id-ID")} Tabung`}
          change={`${Math.round((totalTerdistribusi / totalVolume) * 100)}% dari total volume`}
          changeType="positive"
          icon={TrendingUp}
          iconColor="text-green-600 dark:text-green-400"
          iconBgColor="bg-green-50 dark:bg-green-500/10"
        />
        <StatsCard
          title="Sisa Kuota"
          value={`${totalSisa.toLocaleString("id-ID")} Tabung`}
          change="Tersisa dari semua SA aktif"
          changeType={totalSisa < 1500 ? "negative" : "neutral"}
          icon={AlertTriangle}
          iconColor="text-red-600 dark:text-red-400"
          iconBgColor="bg-red-50 dark:bg-red-500/10"
        />
      </div>

      {/* SA Table */}
      <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-xl">
        <CardHeader className="border-b border-gray-100 dark:border-dark-700 bg-gray-50 dark:bg-dark-850">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
                Daftar Schedule Agreement
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {filtered.length} SA ditemukan
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <Input
                  placeholder="Cari nomor SA..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-52 bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600 text-gray-900 dark:text-white"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44 bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600 text-gray-900 dark:text-white">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-dark-800 border-gray-200 dark:border-dark-700">
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="hampir_habis">Hampir Habis</SelectItem>
                  <SelectItem value="habis">Habis</SelectItem>
                  <SelectItem value="belum_aktif">Belum Aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-dark-850 border-b border-gray-200 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-850">
                  <TableHead className="w-8 px-4" />
                  <TableHead className="px-4 py-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                      No. SA
                    </span>
                  </TableHead>
                  <TableHead className="px-4 py-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                      Periode
                    </span>
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                      Volume (Tabung)
                    </span>
                  </TableHead>
                  <TableHead className="px-4 py-3 min-w-[180px]">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                      Progress Distribusi
                    </span>
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                      Target Harian
                    </span>
                  </TableHead>
                  <TableHead className="px-4 py-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                      Status
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((sa) => {
                  const isExpanded = expandedRows.includes(sa.id);
                  const conf = statusConfig[sa.status];
                  const StatusIcon = conf.icon;

                  return (
                    <>
                      <TableRow
                        key={sa.id}
                        className="border-b border-gray-100 dark:border-dark-700 hover:bg-blue-50/30 dark:hover:bg-blue-500/5 transition-colors cursor-pointer"
                        onClick={() => toggleExpand(sa.id)}
                      >
                        <TableCell className="px-4 py-4 w-8">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <p className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {sa.noSA}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {sa.source}
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {sa.periode}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {sa.tanggalMulai} – {sa.tanggalAkhir}
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-right">
                          <p className="font-bold text-gray-900 dark:text-white">
                            {sa.volumeTotal.toLocaleString("id-ID")}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Sisa:{" "}
                            <span
                              className={cn(
                                "font-semibold",
                                sa.volumeSisa < 1000
                                  ? "text-red-500 dark:text-red-400"
                                  : "text-green-600 dark:text-green-400",
                              )}
                            >
                              {sa.volumeSisa.toLocaleString("id-ID")}
                            </span>
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-4 min-w-[180px]">
                          <ProgressBar
                            used={sa.volumeTerdistribusi}
                            total={sa.volumeTotal}
                          />
                        </TableCell>
                        <TableCell className="px-4 py-4 text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {sa.targetHarian.toLocaleString("id-ID")}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            tabung/hari
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <Badge
                            variant="outline"
                            className={cn(
                              "flex items-center gap-1.5 w-fit text-xs font-medium",
                              conf.className,
                            )}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {conf.label}
                          </Badge>
                        </TableCell>
                      </TableRow>

                      {/* Expanded Detail Row */}
                      {isExpanded && (
                        <TableRow
                          key={`${sa.id}-detail`}
                          className="bg-gray-50/80 dark:bg-dark-850/80 border-b border-gray-200 dark:border-dark-700"
                        >
                          <TableCell colSpan={7} className="px-6 py-5">
                            <div className="space-y-4">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                Detail Target Distribusi Harian
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                                {[
                                  { hari: "Senin", target: sa.targetHarian, actual: Math.round(sa.targetHarian * 0.95) },
                                  { hari: "Selasa", target: sa.targetHarian, actual: Math.round(sa.targetHarian * 1.05) },
                                  { hari: "Rabu", target: sa.targetHarian, actual: Math.round(sa.targetHarian * 0.88) },
                                  { hari: "Kamis", target: sa.targetHarian, actual: Math.round(sa.targetHarian * 1.06) },
                                  { hari: "Jumat", target: sa.targetHarian, actual: Math.round(sa.targetHarian * 1.14) },
                                  { hari: "Sabtu", target: sa.targetHarian, actual: Math.round(sa.targetHarian * 0.9) },
                                  { hari: "Minggu", target: sa.targetHarian, actual: Math.round(sa.targetHarian * 1.1) },
                                ].map((d) => (
                                  <div
                                    key={d.hari}
                                    className="p-3 rounded-lg bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 space-y-1"
                                  >
                                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                                      {d.hari}
                                    </p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                                      {d.actual.toLocaleString("id-ID")}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      Target: {d.target.toLocaleString("id-ID")}
                                    </p>
                                    <div
                                      className={cn(
                                        "w-full h-1 rounded-full",
                                        d.actual >= d.target
                                          ? "bg-green-500"
                                          : "bg-red-400",
                                      )}
                                    />
                                  </div>
                                ))}
                              </div>

                              <div className="flex gap-2 pt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs gap-1 border-gray-300 dark:border-dark-600"
                                >
                                  <Download className="h-3 w-3" />
                                  Export Detail
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs gap-1 border-blue-300 dark:border-blue-500/30 text-blue-700 dark:text-blue-400"
                                >
                                  <FileText className="h-3 w-3" />
                                  Lihat Surat Jalan
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
