import React from "react";
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
  Truck,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  UserCheck,
  Package,
  Search,
  CalendarDays,
  ClipboardList,
  TrendingUp,
} from "lucide-react";

type TabType = "rencana" | "realisasi" | "penugasan";

interface PangkalanAllocation {
  id: string;
  nama: string;
  alamat: string;
  targetBulanan: number;
  alokasi: number;
  driverAssigned: string;
  status: "terjadwal" | "dalam_pengiriman" | "selesai" | "belum";
}

interface RealisasiItem {
  id: string;
  noSJ: string;
  pangkalan: string;
  driver: string;
  noKendaraan: string;
  jumlah: number;
  berangkat: string;
  tiba: string | null;
  status: "selesai" | "dalam_perjalanan" | "terjadwal";
  tanggal: string;
}

interface DriverAssignment {
  id: string;
  nama: string;
  noKendaraan: string;
  kapasitas: number;
  pangkalanTujuan: string[];
  jumlahTabung: number;
  status: "assigned" | "available" | "on_trip";
}

const mockPangkalan: PangkalanAllocation[] = [
  { id: "1", nama: "UD Maju Jaya", alamat: "Jl. Raya Bogor No. 12", targetBulanan: 1800, alokasi: 120, driverAssigned: "Budi Santoso", status: "dalam_pengiriman" },
  { id: "2", nama: "Toko Berkah", alamat: "Jl. Sudirman No. 45", targetBulanan: 1200, alokasi: 80, driverAssigned: "Hendra Wijaya", status: "terjadwal" },
  { id: "3", nama: "CV Sejahtera", alamat: "Jl. Gatot Subroto No. 7", targetBulanan: 1500, alokasi: 100, driverAssigned: "Ahmad Yani", status: "selesai" },
  { id: "4", nama: "Kios Makmur", alamat: "Jl. Pahlawan No. 23", targetBulanan: 900, alokasi: 60, driverAssigned: "", status: "belum" },
  { id: "5", nama: "UD Harapan", alamat: "Jl. Merdeka No. 88", targetBulanan: 1100, alokasi: 90, driverAssigned: "Slamet Riyadi", status: "terjadwal" },
  { id: "6", nama: "Toko Sumber Rejeki", alamat: "Jl. Ahmad Yani No. 15", targetBulanan: 800, alokasi: 55, driverAssigned: "", status: "belum" },
];

const mockRealisasi: RealisasiItem[] = [
  { id: "1", noSJ: "SJ-2026-0342", pangkalan: "UD Maju Jaya", driver: "Budi Santoso", noKendaraan: "B 1234 AB", jumlah: 120, berangkat: "07:30", tiba: "09:15", status: "selesai", tanggal: "26 Mar 2026" },
  { id: "2", noSJ: "SJ-2026-0341", pangkalan: "Toko Berkah", driver: "Hendra Wijaya", noKendaraan: "B 5678 CD", jumlah: 80, berangkat: "08:00", tiba: null, status: "dalam_perjalanan", tanggal: "26 Mar 2026" },
  { id: "3", noSJ: "SJ-2026-0340", pangkalan: "CV Sejahtera", driver: "Ahmad Yani", noKendaraan: "B 9012 EF", jumlah: 100, berangkat: "08:30", tiba: null, status: "terjadwal", tanggal: "26 Mar 2026" },
  { id: "4", noSJ: "SJ-2026-0339", pangkalan: "Kios Makmur", driver: "Budi Santoso", noKendaraan: "B 1234 AB", jumlah: 60, berangkat: "13:00", tiba: "14:30", status: "selesai", tanggal: "25 Mar 2026" },
  { id: "5", noSJ: "SJ-2026-0338", pangkalan: "UD Harapan", driver: "Slamet Riyadi", noKendaraan: "B 3456 GH", jumlah: 90, berangkat: "07:00", tiba: "08:45", status: "selesai", tanggal: "25 Mar 2026" },
];

const mockDrivers: DriverAssignment[] = [
  { id: "1", nama: "Budi Santoso", noKendaraan: "B 1234 AB", kapasitas: 150, pangkalanTujuan: ["UD Maju Jaya", "Kios Makmur"], jumlahTabung: 120, status: "on_trip" },
  { id: "2", nama: "Hendra Wijaya", noKendaraan: "B 5678 CD", kapasitas: 120, pangkalanTujuan: ["Toko Berkah"], jumlahTabung: 80, status: "on_trip" },
  { id: "3", nama: "Ahmad Yani", noKendaraan: "B 9012 EF", kapasitas: 120, pangkalanTujuan: ["CV Sejahtera"], jumlahTabung: 100, status: "assigned" },
  { id: "4", nama: "Slamet Riyadi", noKendaraan: "B 3456 GH", kapasitas: 150, pangkalanTujuan: [], jumlahTabung: 0, status: "available" },
  { id: "5", nama: "Eko Prasetyo", noKendaraan: "B 7890 IJ", kapasitas: 100, pangkalanTujuan: [], jumlahTabung: 0, status: "available" },
];

const allocationStatusConfig = {
  selesai: { label: "Selesai", className: "bg-green-100 text-green-700 border-green-300 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30", icon: CheckCircle2 },
  dalam_pengiriman: { label: "Dalam Pengiriman", className: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30", icon: Truck },
  terjadwal: { label: "Terjadwal", className: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/30", icon: Clock },
  belum: { label: "Belum Dijadwalkan", className: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/30", icon: AlertTriangle },
};

const realisasiStatusConfig = {
  selesai: { label: "Selesai", className: "bg-green-100 text-green-700 border-green-300 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30" },
  dalam_perjalanan: { label: "Dalam Perjalanan", className: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30" },
  terjadwal: { label: "Terjadwal", className: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/30" },
};

const driverStatusConfig = {
  on_trip: { label: "Dalam Perjalanan", className: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30" },
  assigned: { label: "Siap Berangkat", className: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/30" },
  available: { label: "Tersedia", className: "bg-green-100 text-green-700 border-green-300 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30" },
};

export function DistributionPage() {
  const [activeTab, setActiveTab] = useState<TabType>("rencana");
  const [selectedDate, setSelectedDate] = useState("2026-03-26");
  const [searchQuery, setSearchQuery] = useState("");

  const totalAlokasi = mockPangkalan.reduce((s, p) => s + p.alokasi, 0);
  const selesai = mockPangkalan.filter(p => p.status === "selesai").length;
  const belumTerjadwal = mockPangkalan.filter(p => p.status === "belum").length;

  const tabs: { key: TabType; label: string; icon: React.ElementType }[] = [
    { key: "rencana", label: "Rencana Distribusi", icon: ClipboardList },
    { key: "realisasi", label: "Realisasi Pengiriman", icon: Truck },
    { key: "penugasan", label: "Penugasan Driver", icon: UserCheck },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rencana Distribusi"
        description="Kelola rencana distribusi harian, penugasan driver, dan pantau realisasi pengiriman."
        actions={
          <CanAccess permission={PERMISSIONS.DISTRIBUTION_CREATE}>
            <Button className="gap-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white shadow-lg shadow-cyan-500/30">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Buat Rencana</span>
            </Button>
          </CanAccess>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Alokasi Hari Ini"
          value={`${totalAlokasi} Tabung`}
          change="26 Mar 2026"
          changeType="neutral"
          icon={Package}
          iconColor="text-cyan-600 dark:text-cyan-400"
          iconBgColor="bg-cyan-50 dark:bg-cyan-500/10"
        />
        <StatsCard
          title="Pangkalan Selesai"
          value={`${selesai} / ${mockPangkalan.length}`}
          change="Pengiriman hari ini"
          changeType={selesai === mockPangkalan.length ? "positive" : "neutral"}
          icon={CheckCircle2}
          iconColor="text-green-600 dark:text-green-400"
          iconBgColor="bg-green-50 dark:bg-green-500/10"
        />
        <StatsCard
          title="Driver Bertugas"
          value={`${mockDrivers.filter(d => d.status !== "available").length} Driver`}
          change={`${mockDrivers.filter(d => d.status === "available").length} tersedia`}
          changeType="neutral"
          icon={UserCheck}
          iconColor="text-purple-600 dark:text-purple-400"
          iconBgColor="bg-purple-50 dark:bg-purple-500/10"
        />
        <StatsCard
          title="Belum Terjadwal"
          value={`${belumTerjadwal} Pangkalan`}
          change="Perlu dijadwalkan"
          changeType={belumTerjadwal > 0 ? "negative" : "positive"}
          icon={AlertTriangle}
          iconColor="text-red-600 dark:text-red-400"
          iconBgColor="bg-red-50 dark:bg-red-500/10"
        />
      </div>

      {/* Date Selector + Tabs */}
      <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-xl">
        <CardHeader className="border-b border-gray-100 dark:border-dark-700 bg-gray-50 dark:bg-dark-850">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Date selector */}
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Tanggal:
              </label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-44 bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600 text-gray-900 dark:text-white text-sm"
              />
            </div>

            {/* Tabs */}
            <div className="flex border border-gray-200 dark:border-dark-700 rounded-xl p-1 bg-white dark:bg-dark-900 gap-1 sm:ml-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all",
                    activeTab === tab.key
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-800",
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* RENCANA TAB */}
          {activeTab === "rencana" && (
            <div>
              <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-dark-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Cari pangkalan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-56 bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600 text-sm"
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total: <span className="font-bold text-gray-900 dark:text-white">{totalAlokasi}</span> tabung
                </p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-dark-850 hover:bg-gray-50 dark:hover:bg-dark-850 border-b border-gray-200 dark:border-dark-700">
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">Pangkalan</TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-right">Target Bulanan</TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-right">Alokasi Hari Ini</TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">Driver</TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">Status</TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockPangkalan
                      .filter(p => p.nama.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((p) => {
                        const conf = allocationStatusConfig[p.status];
                        const StatusIcon = conf.icon;
                        return (
                          <TableRow key={p.id} className="border-b border-gray-100 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700/30">
                            <TableCell className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                                  <MapPin className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.nama}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{p.alamat}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-right">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{p.targetBulanan.toLocaleString("id-ID")}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">tabung/bln</p>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-right">
                              <Input
                                type="number"
                                defaultValue={p.alokasi}
                                className="w-24 text-right bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600 text-sm font-semibold text-gray-900 dark:text-white ml-auto"
                                min={0}
                              />
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              {p.driverAssigned ? (
                                <div className="flex items-center gap-1.5">
                                  <UserCheck className="h-3.5 w-3.5 text-green-500" />
                                  <span className="text-sm text-gray-900 dark:text-white">{p.driverAssigned}</span>
                                </div>
                              ) : (
                                <Select>
                                  <SelectTrigger className="h-8 w-40 text-xs bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300">
                                    <SelectValue placeholder="Pilih driver" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white dark:bg-dark-800">
                                    {mockDrivers.filter(d => d.status === "available").map(d => (
                                      <SelectItem key={d.id} value={d.id} className="text-xs">
                                        {d.nama} ({d.noKendaraan})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <Badge variant="outline" className={cn("flex items-center gap-1 w-fit text-xs", conf.className)}>
                                <StatusIcon className="h-3 w-3" />
                                {conf.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-center">
                              <Button size="sm" variant="outline" className="text-xs h-7 border-cyan-300 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-500/10">
                                Buat SJ
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="p-4 border-t border-gray-100 dark:border-dark-700 flex justify-end gap-2">
                <Button variant="outline" className="text-sm">Reset</Button>
                <CanAccess permission={PERMISSIONS.DISTRIBUTION_CREATE}>
                  <Button className="text-sm bg-cyan-600 hover:bg-cyan-700 text-white gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    Simpan Rencana
                  </Button>
                </CanAccess>
              </div>
            </div>
          )}

          {/* REALISASI TAB */}
          {activeTab === "realisasi" && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-dark-850 hover:bg-gray-50 dark:hover:bg-dark-850 border-b border-gray-200 dark:border-dark-700">
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">No. Surat Jalan</TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">Pangkalan</TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">Driver</TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-right">Jumlah</TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-center">Berangkat</TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-center">Tiba</TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockRealisasi.map((item) => {
                    const conf = realisasiStatusConfig[item.status];
                    return (
                      <TableRow key={item.id} className="border-b border-gray-100 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700/30">
                        <TableCell className="px-4 py-3">
                          <p className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">{item.noSJ}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{item.tanggal}</p>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{item.pangkalan}</p>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div>
                            <p className="text-sm text-gray-900 dark:text-white">{item.driver}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{item.noKendaraan}</p>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <p className="font-bold text-gray-900 dark:text-white">{item.jumlah}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">tabung</p>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{item.berangkat}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          {item.tiba ? (
                            <span className="text-sm font-medium text-green-600 dark:text-green-400">{item.tiba}</span>
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge variant="outline" className={cn("text-xs font-medium", conf.className)}>
                            {conf.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* PENUGASAN DRIVER TAB */}
          {activeTab === "penugasan" && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-dark-850 hover:bg-gray-50 dark:hover:bg-dark-850 border-b border-gray-200 dark:border-dark-700">
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">Driver</TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">Kendaraan</TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">Tujuan Pangkalan</TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-right">Kapasitas</TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-right">Muatan</TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">Status</TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockDrivers.map((driver) => {
                    const conf = driverStatusConfig[driver.status];
                    return (
                      <TableRow key={driver.id} className="border-b border-gray-100 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700/30">
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center text-sm font-bold text-purple-600 dark:text-purple-400">
                              {driver.nama.charAt(0)}
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{driver.nama}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <span className="font-mono text-sm text-gray-900 dark:text-white">{driver.noKendaraan}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {driver.pangkalanTujuan.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {driver.pangkalanTujuan.map((p) => (
                                <Badge key={p} variant="outline" className="text-xs border-indigo-300 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10">
                                  {p}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{driver.kapasitas}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <div>
                            <span className={cn("text-sm font-bold", driver.jumlahTabung > driver.kapasitas ? "text-red-500" : "text-gray-900 dark:text-white")}>
                              {driver.jumlahTabung}
                            </span>
                            <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-1 mt-1">
                              <div
                                className={cn("h-1 rounded-full", driver.jumlahTabung > driver.kapasitas ? "bg-red-500" : "bg-cyan-500")}
                                style={{ width: `${Math.min((driver.jumlahTabung / driver.kapasitas) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge variant="outline" className={cn("text-xs font-medium", conf.className)}>
                            {conf.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          {driver.status === "available" ? (
                            <CanAccess permission={PERMISSIONS.DRIVERS_ASSIGN}>
                              <Button size="sm" className="text-xs h-7 bg-purple-600 hover:bg-purple-700 text-white">
                                Tugaskan
                              </Button>
                            </CanAccess>
                          ) : (
                            <Button size="sm" variant="outline" className="text-xs h-7 border-gray-300 dark:border-dark-600">
                              Detail
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary widget */}
      {activeTab === "rencana" && (
        <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              Ringkasan Rencana Distribusi — 26 Maret 2026
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Alokasi", value: `${totalAlokasi} tabung`, color: "text-cyan-600 dark:text-cyan-400" },
                { label: "Pangkalan Terjadwal", value: `${mockPangkalan.filter(p => p.status !== "belum").length} dari ${mockPangkalan.length}`, color: "text-green-600 dark:text-green-400" },
                { label: "Driver Ditugaskan", value: `${mockDrivers.filter(d => d.status !== "available").length} dari ${mockDrivers.length}`, color: "text-purple-600 dark:text-purple-400" },
                { label: "Belum Terjadwal", value: `${belumTerjadwal} pangkalan`, color: "text-red-600 dark:text-red-400" },
              ].map((item) => (
                <div key={item.label} className="text-center p-3 rounded-xl bg-gray-50 dark:bg-dark-700/50 border border-gray-200 dark:border-dark-700">
                  <p className={cn("text-lg font-bold", item.color)}>{item.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
