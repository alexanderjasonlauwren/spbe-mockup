import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatsCard } from "@/components/common/StatsCard";
import {
  SortableTableHead,
  type SortDirection,
} from "@/components/common/SortableTableHead";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { formatCurrency, cn } from "@/lib/utils";
import {
  CreditCard,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Upload,
  Eye,
  Filter,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

type PaymentTab = "semua" | "pending" | "terverifikasi";
type PaymentStatus = "menunggu_verifikasi" | "terverifikasi" | "ditolak";

interface Payment {
  id: string;
  noPembayaran: string;
  pangkalan: string;
  noSJ: string;
  nominal: number;
  tanggal: string;
  metodePembayaran: string;
  buktiBayar: boolean;
  status: PaymentStatus;
  verifiedBy?: string;
  catatan?: string;
}

const mockPayments: Payment[] = [
  {
    id: "1",
    noPembayaran: "PAY-2026-0089",
    pangkalan: "UD Maju Jaya",
    noSJ: "SJ-2026-0342",
    nominal: 15600000,
    tanggal: "26 Mar 2026",
    metodePembayaran: "Transfer BCA",
    buktiBayar: true,
    status: "menunggu_verifikasi",
  },
  {
    id: "2",
    noPembayaran: "PAY-2026-0088",
    pangkalan: "Toko Berkah",
    noSJ: "SJ-2026-0335",
    nominal: 10400000,
    tanggal: "25 Mar 2026",
    metodePembayaran: "Transfer BRI",
    buktiBayar: true,
    status: "menunggu_verifikasi",
  },
  {
    id: "3",
    noPembayaran: "PAY-2026-0087",
    pangkalan: "CV Sejahtera",
    noSJ: "SJ-2026-0328",
    nominal: 13000000,
    tanggal: "25 Mar 2026",
    metodePembayaran: "Transfer Mandiri",
    buktiBayar: false,
    status: "menunggu_verifikasi",
  },
  {
    id: "4",
    noPembayaran: "PAY-2026-0086",
    pangkalan: "Kios Makmur",
    noSJ: "SJ-2026-0321",
    nominal: 7800000,
    tanggal: "24 Mar 2026",
    metodePembayaran: "Transfer BCA",
    buktiBayar: true,
    status: "terverifikasi",
    verifiedBy: "Siti Rahayu",
  },
  {
    id: "5",
    noPembayaran: "PAY-2026-0085",
    pangkalan: "UD Harapan",
    noSJ: "SJ-2026-0314",
    nominal: 11700000,
    tanggal: "24 Mar 2026",
    metodePembayaran: "Transfer BRI",
    buktiBayar: true,
    status: "terverifikasi",
    verifiedBy: "Siti Rahayu",
  },
  {
    id: "6",
    noPembayaran: "PAY-2026-0084",
    pangkalan: "Toko Sumber Rejeki",
    noSJ: "SJ-2026-0307",
    nominal: 9100000,
    tanggal: "23 Mar 2026",
    metodePembayaran: "Transfer BCA",
    buktiBayar: true,
    status: "terverifikasi",
    verifiedBy: "Ahmad Fauzi",
  },
  {
    id: "7",
    noPembayaran: "PAY-2026-0083",
    pangkalan: "UD Maju Jaya",
    noSJ: "SJ-2026-0300",
    nominal: 15600000,
    tanggal: "22 Mar 2026",
    metodePembayaran: "Transfer BCA",
    buktiBayar: false,
    status: "ditolak",
    catatan: "Bukti bayar tidak valid, nominal tidak sesuai",
  },
  {
    id: "8",
    noPembayaran: "PAY-2026-0082",
    pangkalan: "Toko Berkah",
    noSJ: "SJ-2026-0293",
    nominal: 10400000,
    tanggal: "22 Mar 2026",
    metodePembayaran: "Transfer BRI",
    buktiBayar: true,
    status: "terverifikasi",
    verifiedBy: "Ahmad Fauzi",
  },
];

const statusConfig = {
  menunggu_verifikasi: {
    label: "Menunggu Verifikasi",
    className:
      "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/30",
    icon: Clock,
  },
  terverifikasi: {
    label: "Terverifikasi",
    className:
      "bg-green-100 text-green-700 border-green-300 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30",
    icon: CheckCircle2,
  },
  ditolak: {
    label: "Ditolak",
    className:
      "bg-red-100 text-red-700 border-red-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30",
    icon: XCircle,
  },
};

export function PaymentPage() {
  const [activeTab, setActiveTab] = useState<PaymentTab>("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [sortKey, setSortKey] = useState<
    | "noPembayaran"
    | "tanggal"
    | "pangkalan"
    | "noSJ"
    | "nominal"
    | "metodePembayaran"
    | "status"
  >("noPembayaran");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const filtered = mockPayments.filter((p) => {
    const matchesSearch =
      p.pangkalan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.noPembayaran.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.noSJ.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab =
      activeTab === "semua" ||
      (activeTab === "pending" && p.status === "menunggu_verifikasi") ||
      (activeTab === "terverifikasi" && p.status === "terverifikasi");

    const matchesMethod =
      methodFilter === "all" || p.metodePembayaran.includes(methodFilter);

    return matchesSearch && matchesTab && matchesMethod;
  });

  const handleSort = (
    nextSortKey:
      | "noPembayaran"
      | "tanggal"
      | "pangkalan"
      | "noSJ"
      | "nominal"
      | "metodePembayaran"
      | "status",
  ) => {
    if (sortKey === nextSortKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection("asc");
  };

  const sortedFiltered = [...filtered].sort((left, right) => {
    let compareValue = 0;

    if (sortKey === "noPembayaran") {
      compareValue = left.noPembayaran.localeCompare(
        right.noPembayaran,
        "id-ID",
      );
    }

    if (sortKey === "tanggal") {
      compareValue =
        new Date(left.tanggal).getTime() - new Date(right.tanggal).getTime();
    }

    if (sortKey === "pangkalan") {
      compareValue = left.pangkalan.localeCompare(right.pangkalan, "id-ID");
    }

    if (sortKey === "noSJ") {
      compareValue = left.noSJ.localeCompare(right.noSJ, "id-ID");
    }

    if (sortKey === "nominal") {
      compareValue = left.nominal - right.nominal;
    }

    if (sortKey === "metodePembayaran") {
      compareValue = left.metodePembayaran.localeCompare(
        right.metodePembayaran,
        "id-ID",
      );
    }

    if (sortKey === "status") {
      compareValue = left.status.localeCompare(right.status, "id-ID");
    }

    return sortDirection === "asc" ? compareValue : -compareValue;
  });

  const totalPending = mockPayments
    .filter((p) => p.status === "menunggu_verifikasi")
    .reduce((s, p) => s + p.nominal, 0);
  const totalVerified = mockPayments
    .filter((p) => p.status === "terverifikasi")
    .reduce((s, p) => s + p.nominal, 0);
  const countPending = mockPayments.filter(
    (p) => p.status === "menunggu_verifikasi",
  ).length;
  const countWithoutProof = mockPayments.filter(
    (p) => !p.buktiBayar && p.status === "menunggu_verifikasi",
  ).length;

  const tabs: { key: PaymentTab; label: string; count: number }[] = [
    { key: "semua", label: "Semua Pembayaran", count: mockPayments.length },
    { key: "pending", label: "Menunggu Verifikasi", count: countPending },
    {
      key: "terverifikasi",
      label: "Terverifikasi",
      count: mockPayments.filter((p) => p.status === "terverifikasi").length,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pembayaran & Verifikasi"
        description="Rekam pembayaran dari pangkalan dan verifikasi bukti transfer."
        actions={
          <CanAccess permission={PERMISSIONS.PAYMENTS_CREATE}>
            <Button className="gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Catat Pembayaran</span>
            </Button>
          </CanAccess>
        }
      />

      {/* Alert for no proof */}
      {countWithoutProof > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30">
          <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">
              {countWithoutProof} Pembayaran Tanpa Bukti Transfer
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">
              Minta pangkalan untuk mengunggah bukti transfer sebelum verifikasi
              dilakukan.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Menunggu Verifikasi"
          value={formatCurrency(totalPending)}
          change={`${countPending} transaksi pending`}
          changeType="negative"
          icon={Clock}
          iconColor="text-yellow-600 dark:text-yellow-400"
          iconBgColor="bg-yellow-50 dark:bg-yellow-500/10"
        />
        <StatsCard
          title="Total Terverifikasi"
          value={formatCurrency(totalVerified)}
          change={`${mockPayments.filter((p) => p.status === "terverifikasi").length} transaksi`}
          changeType="positive"
          icon={CheckCircle2}
          iconColor="text-green-600 dark:text-green-400"
          iconBgColor="bg-green-50 dark:bg-green-500/10"
        />
        <StatsCard
          title="Total Nilai Bulan Ini"
          value={formatCurrency(totalPending + totalVerified)}
          change="Maret 2026"
          changeType="neutral"
          icon={CreditCard}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBgColor="bg-emerald-50 dark:bg-emerald-500/10"
        />
        <StatsCard
          title="Rata-rata per Transaksi"
          value={formatCurrency(
            Math.round((totalPending + totalVerified) / mockPayments.length),
          )}
          change="Rata-rata nilai pembayaran"
          changeType="neutral"
          icon={TrendingUp}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBgColor="bg-blue-50 dark:bg-blue-500/10"
        />
      </div>

      {/* Payment Table */}
      <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-xl">
        <CardHeader className="p-0 border-b border-gray-100 dark:border-dark-700 bg-gray-50 dark:bg-dark-850">
          <div className="px-6 py-4">
            {/* Tab navigation */}
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition-all",
                    activeTab === tab.key
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white dark:bg-dark-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-dark-600 hover:border-emerald-400",
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full",
                      activeTab === tab.key
                        ? "bg-white/20 text-white"
                        : "bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 dark:border-dark-700">
            {/* Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="flex flex-col sm:flex-row gap-3 lg:flex-1 lg:max-w-3xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <Input
                    placeholder="Cari pangkalan, no pembayaran, no SJ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600 text-gray-900 dark:text-white"
                  />
                </div>
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger className="w-full sm:w-44 bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600 text-gray-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-400" />
                      <SelectValue placeholder="Metode Bayar" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-dark-800 border-gray-200 dark:border-dark-700">
                    <SelectItem value="all">Semua Metode</SelectItem>
                    <SelectItem value="BCA">BCA</SelectItem>
                    <SelectItem value="BRI">BRI</SelectItem>
                    <SelectItem value="Mandiri">Mandiri</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap lg:ml-2 lg:text-right">
                {filtered.length} transaksi
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-dark-850 hover:bg-gray-50 dark:hover:bg-dark-850 border-b border-gray-200 dark:border-dark-700">
                  <SortableTableHead
                    label="No. Pembayaran"
                    sortKey="noPembayaran"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHead
                    label="Pangkalan"
                    sortKey="pangkalan"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHead
                    label="No. Surat Jalan"
                    sortKey="noSJ"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHead
                    label="Nominal"
                    sortKey="nominal"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableTableHead
                    label="Metode"
                    sortKey="metodePembayaran"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-center">
                    Bukti Bayar
                  </TableHead>
                  <SortableTableHead
                    label="Status"
                    sortKey="status"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-center">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-32 text-center text-gray-500 dark:text-gray-400"
                    >
                      Tidak ada data pembayaran yang ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedFiltered.map((payment) => {
                    const conf = statusConfig[payment.status];
                    const StatusIcon = conf.icon;
                    return (
                      <TableRow
                        key={payment.id}
                        className="border-b border-gray-100 dark:border-dark-700 hover:bg-emerald-50/30 dark:hover:bg-emerald-500/5 transition-colors"
                      >
                        <TableCell className="px-4 py-4">
                          <p className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {payment.noPembayaran}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {payment.tanggal}
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {payment.pangkalan}
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                            {payment.noSJ}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-right">
                          <p className="font-bold text-gray-900 dark:text-white">
                            {formatCurrency(payment.nominal)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {payment.metodePembayaran}
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {payment.metodePembayaran}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-center">
                          {payment.buktiBayar ? (
                            <button className="flex items-center gap-1 mx-auto text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                              <Eye className="h-3.5 w-3.5" />
                              Lihat
                            </button>
                          ) : (
                            <button className="flex items-center gap-1 mx-auto text-xs font-medium text-orange-600 dark:text-orange-400 hover:underline">
                              <Upload className="h-3.5 w-3.5" />
                              Upload
                            </button>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <div className="space-y-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "flex items-center gap-1 w-fit text-xs font-medium",
                                conf.className,
                              )}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {conf.label}
                            </Badge>
                            {payment.verifiedBy && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                oleh {payment.verifiedBy}
                              </p>
                            )}
                            {payment.catatan && (
                              <p
                                className="text-xs text-red-500 dark:text-red-400 max-w-[160px] truncate"
                                title={payment.catatan}
                              >
                                {payment.catatan}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {payment.status === "menunggu_verifikasi" && (
                              <CanAccess
                                permission={PERMISSIONS.PAYMENTS_VERIFY}
                              >
                                <Button
                                  size="sm"
                                  className={cn(
                                    "text-xs h-7 gap-1",
                                    !payment.buktiBayar
                                      ? "bg-gray-400 cursor-not-allowed opacity-60"
                                      : "bg-emerald-600 hover:bg-emerald-700 text-white",
                                  )}
                                  disabled={!payment.buktiBayar}
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  Verifikasi
                                </Button>
                              </CanAccess>
                            )}
                            {payment.status === "terverifikasi" && (
                              <Badge
                                variant="outline"
                                className="text-xs text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30"
                              >
                                ✓ Selesai
                              </Badge>
                            )}
                            {payment.status === "ditolak" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 border-orange-300 dark:border-orange-500/30 text-orange-700 dark:text-orange-400 hover:bg-orange-50"
                              >
                                Kirim Ulang
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
