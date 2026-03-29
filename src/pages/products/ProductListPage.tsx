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
  MapPin,
  Plus,
  Search,
  Phone,
  Package,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Building,
} from "lucide-react";

interface Pangkalan {
  id: string;
  nama: string;
  alamat: string;
  kota: string;
  noHP: string;
  noNPWP: string;
  targetBulanan: number;
  distribusiBulanIni: number;
  pembayaranStatus: "lunas" | "pending" | "tunggakan";
  status: "aktif" | "nonaktif";
  bergabungSejak: string;
  cabang: string;
}

const mockPangkalan: Pangkalan[] = [
  {
    id: "1",
    nama: "UD Maju Jaya",
    alamat: "Jl. Raya Bogor No. 12",
    kota: "Jakarta Timur",
    noHP: "0812-3333-4444",
    noNPWP: "12.345.678.9-001.000",
    targetBulanan: 1800,
    distribusiBulanIni: 1640,
    pembayaranStatus: "lunas",
    status: "aktif",
    bergabungSejak: "Jan 2022",
    cabang: "Pusat - Jakarta",
  },
  {
    id: "2",
    nama: "Toko Berkah",
    alamat: "Jl. Sudirman No. 45",
    kota: "Jakarta Pusat",
    noHP: "0813-5555-6666",
    noNPWP: "23.456.789.0-002.000",
    targetBulanan: 1200,
    distribusiBulanIni: 1100,
    pembayaranStatus: "pending",
    status: "aktif",
    bergabungSejak: "Mar 2022",
    cabang: "Pusat - Jakarta",
  },
  {
    id: "3",
    nama: "CV Sejahtera",
    alamat: "Jl. Gatot Subroto No. 7",
    kota: "Jakarta Selatan",
    noHP: "0811-7777-8888",
    noNPWP: "34.567.890.1-003.000",
    targetBulanan: 1500,
    distribusiBulanIni: 1420,
    pembayaranStatus: "lunas",
    status: "aktif",
    bergabungSejak: "Nov 2021",
    cabang: "Pusat - Jakarta",
  },
  {
    id: "4",
    nama: "Kios Makmur",
    alamat: "Jl. Pahlawan No. 23",
    kota: "Depok",
    noHP: "0814-9999-0000",
    noNPWP: "45.678.901.2-004.000",
    targetBulanan: 900,
    distribusiBulanIni: 760,
    pembayaranStatus: "tunggakan",
    status: "aktif",
    bergabungSejak: "Jun 2023",
    cabang: "Cabang Depok",
  },
  {
    id: "5",
    nama: "UD Harapan",
    alamat: "Jl. Merdeka No. 88",
    kota: "Jakarta Barat",
    noHP: "0815-1111-2222",
    noNPWP: "56.789.012.3-005.000",
    targetBulanan: 1100,
    distribusiBulanIni: 980,
    pembayaranStatus: "lunas",
    status: "aktif",
    bergabungSejak: "Aug 2022",
    cabang: "Pusat - Jakarta",
  },
  {
    id: "6",
    nama: "Toko Sumber Rejeki",
    alamat: "Jl. Ahmad Yani No. 15",
    kota: "Bogor",
    noHP: "0816-3333-4444",
    noNPWP: "67.890.123.4-006.000",
    targetBulanan: 800,
    distribusiBulanIni: 0,
    pembayaranStatus: "lunas",
    status: "nonaktif",
    bergabungSejak: "Oct 2023",
    cabang: "Cabang Bogor",
  },
];

const bayarStatusConfig = {
  lunas: {
    label: "Lunas",
    className:
      "bg-green-100 text-green-700 border-green-300 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pending",
    className:
      "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/30",
    icon: AlertCircle,
  },
  tunggakan: {
    label: "Tunggakan",
    className:
      "bg-red-100 text-red-700 border-red-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30",
    icon: AlertCircle,
  },
};

export function ProductListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bayarFilter, setBayarFilter] = useState("all");

  const filtered = mockPangkalan.filter((p) => {
    const matchesSearch =
      p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.kota.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesBayar =
      bayarFilter === "all" || p.pembayaranStatus === bayarFilter;
    return matchesSearch && matchesStatus && matchesBayar;
  });

  const totalPangkalan = mockPangkalan.length;
  const aktif = mockPangkalan.filter((p) => p.status === "aktif").length;
  const totalTarget = mockPangkalan.reduce((s, p) => s + p.targetBulanan, 0);
  const totalDistribusi = mockPangkalan.reduce(
    (s, p) => s + p.distribusiBulanIni,
    0,
  );
  const tunggakan = mockPangkalan.filter(
    (p) => p.pembayaranStatus === "tunggakan",
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Pangkalan"
        description="Kelola data mitra distribusi LPG (pangkalan) dan pantau penyaluran."
        actions={
          <CanAccess permission={PERMISSIONS.PRODUCTS_CREATE}>
            <Button className="gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/30">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Tambah Pangkalan</span>
            </Button>
          </CanAccess>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Pangkalan"
          value={`${totalPangkalan} Pangkalan`}
          change={`${aktif} aktif`}
          changeType="positive"
          icon={MapPin}
          iconColor="text-indigo-600 dark:text-indigo-400"
          iconBgColor="bg-indigo-50 dark:bg-indigo-500/10"
        />
        <StatsCard
          title="Target Bulanan"
          value={`${totalTarget.toLocaleString("id-ID")} Tabung`}
          change="Total semua pangkalan"
          changeType="neutral"
          icon={Package}
          iconColor="text-cyan-600 dark:text-cyan-400"
          iconBgColor="bg-cyan-50 dark:bg-cyan-500/10"
        />
        <StatsCard
          title="Terdistribusi Bulan Ini"
          value={`${totalDistribusi.toLocaleString("id-ID")} Tabung`}
          change={`${Math.round((totalDistribusi / totalTarget) * 100)}% dari target`}
          changeType="positive"
          icon={TrendingUp}
          iconColor="text-green-600 dark:text-green-400"
          iconBgColor="bg-green-50 dark:bg-green-500/10"
        />
        <StatsCard
          title="Tunggakan Pembayaran"
          value={`${tunggakan} Pangkalan`}
          change="Perlu tindak lanjut"
          changeType={tunggakan > 0 ? "negative" : "positive"}
          icon={Building}
          iconColor="text-red-600 dark:text-red-400"
          iconBgColor="bg-red-50 dark:bg-red-500/10"
        />
      </div>

      {/* Table */}
      <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-xl">
        <CardHeader className="border-b border-gray-100 dark:border-dark-700 bg-gray-50 dark:bg-dark-850">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
                Daftar Pangkalan
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {filtered.length} dari {totalPangkalan} ditampilkan
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cari nama atau kota..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-52 bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600 text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32 bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-dark-800">
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="nonaktif">Non-aktif</SelectItem>
                </SelectContent>
              </Select>
              <Select value={bayarFilter} onValueChange={setBayarFilter}>
                <SelectTrigger className="w-full sm:w-36 bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600 text-sm">
                  <SelectValue placeholder="Pembayaran" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-dark-800">
                  <SelectItem value="all">Semua Bayar</SelectItem>
                  <SelectItem value="lunas">Lunas</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="tunggakan">Tunggakan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-dark-850 hover:bg-gray-50 dark:hover:bg-dark-850 border-b border-gray-200 dark:border-dark-700">
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                    Pangkalan
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                    Cabang
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-right">
                    Target Bulanan
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 min-w-[160px]">
                    Distribusi Bulan Ini
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                    Pembayaran
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                    Status
                  </TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-center">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const bayarConf = bayarStatusConfig[p.pembayaranStatus];
                  const BayarIcon = bayarConf.icon;
                  const distribusiPct = Math.round(
                    (p.distribusiBulanIni / p.targetBulanan) * 100,
                  );

                  return (
                    <TableRow
                      key={p.id}
                      className="border-b border-gray-100 dark:border-dark-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 transition-colors"
                    >
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                            <MapPin className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {p.nama}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3 text-gray-400" />
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {p.noHP}
                              </p>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {p.kota}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {p.cabang}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {p.targetBulanan.toLocaleString("id-ID")}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          tabung/bln
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {p.distribusiBulanIni.toLocaleString("id-ID")}
                            </span>
                            <span
                              className={cn(
                                "font-semibold",
                                distribusiPct >= 90
                                  ? "text-green-600 dark:text-green-400"
                                  : distribusiPct >= 70
                                    ? "text-yellow-600 dark:text-yellow-400"
                                    : "text-red-600 dark:text-red-400",
                              )}
                            >
                              {distribusiPct}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-1.5">
                            <div
                              className={cn(
                                "h-1.5 rounded-full",
                                distribusiPct >= 90
                                  ? "bg-green-500"
                                  : distribusiPct >= 70
                                    ? "bg-yellow-500"
                                    : "bg-red-500",
                              )}
                              style={{
                                width: `${Math.min(distribusiPct, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "flex items-center gap-1 w-fit text-xs font-medium",
                            bayarConf.className,
                          )}
                        >
                          <BayarIcon className="h-3 w-3" />
                          {bayarConf.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-medium",
                            p.status === "aktif"
                              ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30"
                              : "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/30",
                          )}
                        >
                          {p.status === "aktif" ? "Aktif" : "Non-aktif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 border-gray-300 dark:border-dark-600"
                          >
                            Detail
                          </Button>
                          <CanAccess permission={PERMISSIONS.PRODUCTS_EDIT}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 border-indigo-300 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50"
                            >
                              Edit
                            </Button>
                          </CanAccess>
                        </div>
                      </TableCell>
                    </TableRow>
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
