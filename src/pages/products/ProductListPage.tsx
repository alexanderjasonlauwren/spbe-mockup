import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatsCard } from "@/components/common/StatsCard";
import {
  SortableTableHead,
  type SortDirection,
} from "@/components/common/SortableTableHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CanAccess } from "@/features/rbac/components/CanAccess";
import { PERMISSIONS } from "@/features/rbac/permissions";
import { useNavigate } from "react-router-dom";
import {
  Package,
  BarChart3,
  TrendingDown,
  AlertTriangle,
  Search,
  Plus,
  Edit,
} from "lucide-react";

interface LPGProduct {
  id: string;
  nama: string;
  ukuran: string;
  harga: number;
  stok: number;
  stokMinimal: number;
  kategori: "Rumah Tangga" | "Komersial" | "Industri";
  merek: string;
  status: "tersedia" | "terbatas" | "habis";
}

const mockProducts: LPGProduct[] = [
  {
    id: "1",
    nama: "LPG Biru",
    ukuran: "3 kg",
    harga: 25000,
    stok: 450,
    stokMinimal: 100,
    kategori: "Rumah Tangga",
    merek: "Pertamina",
    status: "tersedia",
  },
  {
    id: "2",
    nama: "LPG Biru",
    ukuran: "5 kg",
    harga: 40000,
    stok: 320,
    stokMinimal: 100,
    kategori: "Rumah Tangga",
    merek: "Pertamina",
    status: "tersedia",
  },
  {
    id: "3",
    nama: "LPG Biru",
    ukuran: "12 kg",
    harga: 96000,
    stok: 180,
    stokMinimal: 50,
    kategori: "Rumah Tangga",
    merek: "Pertamina",
    status: "tersedia",
  },
  {
    id: "4",
    nama: "LPG Merah",
    ukuran: "50 kg",
    harga: 400000,
    stok: 45,
    stokMinimal: 20,
    kategori: "Komersial",
    merek: "Pertamina",
    status: "terbatas",
  },
  {
    id: "5",
    nama: "LPG Merah",
    ukuran: "100 kg",
    harga: 800000,
    stok: 15,
    stokMinimal: 10,
    kategori: "Industri",
    merek: "Pertamina",
    status: "terbatas",
  },
  {
    id: "6",
    nama: "LPG Kuning",
    ukuran: "12 kg",
    harga: 92000,
    stok: 0,
    stokMinimal: 50,
    kategori: "Rumah Tangga",
    merek: "Shell",
    status: "habis",
  },
];

const statusConfig = {
  tersedia: {
    label: "Tersedia",
    className:
      "bg-green-100 text-green-700 border-green-300 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30",
  },
  terbatas: {
    label: "Terbatas",
    className:
      "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/30",
  },
  habis: {
    label: "Habis",
    className:
      "bg-red-100 text-red-700 border-red-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30",
  },
};

export function ProductListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortKey, setSortKey] = useState<"nama" | "harga" | "stok" | "status">(
    "nama",
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const filtered = mockProducts.filter((p) => {
    const matchesSearch =
      p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.merek.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ukuran.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesCategory =
      categoryFilter === "all" || p.kategori === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleSort = (nextSortKey: "nama" | "harga" | "stok" | "status") => {
    if (sortKey === nextSortKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection("asc");
  };

  const sortedFiltered = [...filtered].sort((left, right) => {
    let compareValue = 0;

    if (sortKey === "nama") {
      compareValue = `${left.nama} ${left.ukuran}`.localeCompare(
        `${right.nama} ${right.ukuran}`,
        "id-ID",
      );
    }

    if (sortKey === "harga") {
      compareValue = left.harga - right.harga;
    }

    if (sortKey === "stok") {
      compareValue = left.stok - right.stok;
    }

    if (sortKey === "status") {
      compareValue = left.status.localeCompare(right.status, "id-ID");
    }

    return sortDirection === "asc" ? compareValue : -compareValue;
  });

  const totalProducts = mockProducts.length;
  const totalStok = mockProducts.reduce((s, p) => s + p.stok, 0);
  const stokHabis = mockProducts.filter((p) => p.status === "habis").length;
  const stokTerbatas = mockProducts.filter(
    (p) => p.status === "terbatas",
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Produk LPG"
        description="Kelola katalog produk LPG, harga, dan inventaris."
        actions={
          <CanAccess permission={PERMISSIONS.PRODUCTS_CREATE}>
            <Button
              className="gap-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white shadow-lg shadow-cyan-500/30"
              onClick={() => navigate("/products/new-product")}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Tambah Produk</span>
            </Button>
          </CanAccess>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Produk"
          value={`${totalProducts} Produk`}
          change="SKU LPG"
          changeType="neutral"
          icon={Package}
          iconColor="text-cyan-600 dark:text-cyan-400"
          iconBgColor="bg-cyan-50 dark:bg-cyan-500/10"
        />
        <StatsCard
          title="Total Stok"
          value={`${totalStok.toLocaleString("id-ID")} Unit`}
          change="Semua varian"
          changeType="positive"
          icon={BarChart3}
          iconColor="text-green-600 dark:text-green-400"
          iconBgColor="bg-green-50 dark:bg-green-500/10"
        />
        <StatsCard
          title="Stok Terbatas"
          value={`${stokTerbatas} Produk`}
          change="Perlu restok"
          changeType={stokTerbatas > 0 ? "negative" : "positive"}
          icon={TrendingDown}
          iconColor="text-yellow-600 dark:text-yellow-400"
          iconBgColor="bg-yellow-50 dark:bg-yellow-500/10"
        />
        <StatsCard
          title="Stok Habis"
          value={`${stokHabis} Produk`}
          change="Segera restok"
          changeType={stokHabis > 0 ? "negative" : "positive"}
          icon={AlertTriangle}
          iconColor="text-red-600 dark:text-red-400"
          iconBgColor="bg-red-50 dark:bg-red-500/10"
        />
      </div>

      {/* Table */}
      <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-xl">
        <CardHeader className="p-0 border-b border-gray-100 dark:border-dark-700 bg-gray-50 dark:bg-dark-850">
          <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
                Daftar Produk LPG
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {filtered.length} dari {totalProducts} ditampilkan
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cari produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-52 bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600 text-sm"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-40 bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600 text-sm">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-dark-800">
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  <SelectItem value="Rumah Tangga">Rumah Tangga</SelectItem>
                  <SelectItem value="Komersial">Komersial</SelectItem>
                  <SelectItem value="Industri">Industri</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40 bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600 text-sm">
                  <SelectValue placeholder="Stok" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-dark-800">
                  <SelectItem value="all">Semua Stok</SelectItem>
                  <SelectItem value="tersedia">Tersedia</SelectItem>
                  <SelectItem value="terbatas">Terbatas</SelectItem>
                  <SelectItem value="habis">Habis</SelectItem>
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
                  <SortableTableHead
                    label="Produk"
                    sortKey="nama"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                    Kategori
                  </TableHead>
                  <SortableTableHead
                    label="Harga"
                    sortKey="harga"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableTableHead
                    label="Stok"
                    sortKey="stok"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
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
                {sortedFiltered.map((p) => {
                  const stokConf = statusConfig[p.status];

                  return (
                    <TableRow
                      key={p.id}
                      className="border-b border-gray-100 dark:border-dark-700 hover:bg-cyan-50/30 dark:hover:bg-cyan-500/5 transition-colors"
                    >
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center shrink-0">
                            <Package className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {p.nama}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {p.ukuran}
                              </p>
                              <span className="text-xs text-gray-400">•</span>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {p.merek}
                              </p>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {p.kategori}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <p className="font-bold text-gray-900 dark:text-white">
                          Rp {p.harga.toLocaleString("id-ID")}
                        </p>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end">
                          <p
                            className={cn(
                              "font-semibold",
                              p.stok > p.stokMinimal
                                ? "text-green-600 dark:text-green-400"
                                : p.stok > 0
                                  ? "text-yellow-600 dark:text-yellow-400"
                                  : "text-red-600 dark:text-red-400",
                            )}
                          >
                            {p.stok}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            min: {p.stokMinimal}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-medium",
                            stokConf.className,
                          )}
                        >
                          {stokConf.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <CanAccess permission={PERMISSIONS.PRODUCTS_EDIT}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 border-cyan-300 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </CanAccess>
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
