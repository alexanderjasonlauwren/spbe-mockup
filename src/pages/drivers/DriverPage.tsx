import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatsCard } from "@/components/common/StatsCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { CanAccess } from "@/features/rbac/components/CanAccess";
import { PERMISSIONS } from "@/features/rbac/permissions";
import { cn } from "@/lib/utils";
import {
  UserCheck,
  Plus,
  Search,
  Phone,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Star,
  MapPin,
  TrendingUp,
} from "lucide-react";

interface Driver {
  id: string;
  nama: string;
  noHP: string;
  noKendaraan: string;
  jenisKendaraan: string;
  kapasitas: number;
  status: "aktif" | "istirahat" | "tidak_aktif";
  tripHariIni: number;
  totalTabungBulanIni: number;
  ratingKinerja: number;
  bergabungSejak: string;
  pangkalanTerakhir: string;
}

interface TripLog {
  id: string;
  driver: string;
  noSJ: string;
  pangkalan: string;
  jumlah: number;
  berangkat: string;
  tiba: string | null;
  durasi: string | null;
  status: "selesai" | "dalam_perjalanan" | "terjadwal";
  tanggal: string;
}

const mockDrivers: Driver[] = [
  {
    id: "1",
    nama: "Budi Santoso",
    noHP: "0812-3456-7890",
    noKendaraan: "B 1234 AB",
    jenisKendaraan: "Truk Engkel",
    kapasitas: 150,
    status: "aktif",
    tripHariIni: 2,
    totalTabungBulanIni: 3420,
    ratingKinerja: 4.8,
    bergabungSejak: "Jan 2024",
    pangkalanTerakhir: "UD Maju Jaya",
  },
  {
    id: "2",
    nama: "Hendra Wijaya",
    noHP: "0813-5678-9012",
    noKendaraan: "B 5678 CD",
    jenisKendaraan: "Pick Up",
    kapasitas: 120,
    status: "aktif",
    tripHariIni: 1,
    totalTabungBulanIni: 2890,
    ratingKinerja: 4.6,
    bergabungSejak: "Mar 2024",
    pangkalanTerakhir: "Toko Berkah",
  },
  {
    id: "3",
    nama: "Ahmad Yani",
    noHP: "0811-9012-3456",
    noKendaraan: "B 9012 EF",
    jenisKendaraan: "Pick Up",
    kapasitas: 120,
    status: "aktif",
    tripHariIni: 0,
    totalTabungBulanIni: 3100,
    ratingKinerja: 4.9,
    bergabungSejak: "Nov 2023",
    pangkalanTerakhir: "CV Sejahtera",
  },
  {
    id: "4",
    nama: "Slamet Riyadi",
    noHP: "0814-3456-7890",
    noKendaraan: "B 3456 GH",
    jenisKendaraan: "Truk Engkel",
    kapasitas: 150,
    status: "aktif",
    tripHariIni: 3,
    totalTabungBulanIni: 4200,
    ratingKinerja: 4.7,
    bergabungSejak: "Aug 2023",
    pangkalanTerakhir: "UD Harapan",
  },
  {
    id: "5",
    nama: "Eko Prasetyo",
    noHP: "0815-7890-1234",
    noKendaraan: "B 7890 IJ",
    jenisKendaraan: "Pick Up",
    kapasitas: 100,
    status: "aktif",
    tripHariIni: 0,
    totalTabungBulanIni: 1850,
    ratingKinerja: 4.3,
    bergabungSejak: "Jun 2025",
    pangkalanTerakhir: "Toko Sumber Rejeki",
  },
  {
    id: "6",
    nama: "Dedi Kusuma",
    noHP: "0816-1234-5678",
    noKendaraan: "B 2345 KL",
    jenisKendaraan: "Truk Engkel",
    kapasitas: 150,
    status: "istirahat",
    tripHariIni: 0,
    totalTabungBulanIni: 980,
    ratingKinerja: 4.1,
    bergabungSejak: "Sep 2025",
    pangkalanTerakhir: "Kios Makmur",
  },
];

const mockTripLogs: TripLog[] = [
  {
    id: "1",
    driver: "Budi Santoso",
    noSJ: "SJ-2026-0342",
    pangkalan: "UD Maju Jaya",
    jumlah: 120,
    berangkat: "07:30",
    tiba: "09:15",
    durasi: "1j 45m",
    status: "selesai",
    tanggal: "26 Mar 2026",
  },
  {
    id: "2",
    driver: "Hendra Wijaya",
    noSJ: "SJ-2026-0341",
    pangkalan: "Toko Berkah",
    jumlah: 80,
    berangkat: "08:00",
    tiba: null,
    durasi: null,
    status: "dalam_perjalanan",
    tanggal: "26 Mar 2026",
  },
  {
    id: "3",
    driver: "Budi Santoso",
    noSJ: "SJ-2026-0339",
    pangkalan: "Kios Makmur",
    jumlah: 60,
    berangkat: "13:00",
    tiba: "14:30",
    durasi: "1j 30m",
    status: "selesai",
    tanggal: "25 Mar 2026",
  },
  {
    id: "4",
    driver: "Slamet Riyadi",
    noSJ: "SJ-2026-0338",
    pangkalan: "UD Harapan",
    jumlah: 90,
    berangkat: "07:00",
    tiba: "08:45",
    durasi: "1j 45m",
    status: "selesai",
    tanggal: "25 Mar 2026",
  },
  {
    id: "5",
    driver: "Ahmad Yani",
    noSJ: "SJ-2026-0337",
    pangkalan: "CV Sejahtera",
    jumlah: 100,
    berangkat: "08:30",
    tiba: "10:20",
    durasi: "1j 50m",
    status: "selesai",
    tanggal: "25 Mar 2026",
  },
];

const driverStatusConfig = {
  aktif: {
    label: "Aktif",
    className:
      "bg-green-100 text-green-700 border-green-300 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30",
  },
  istirahat: {
    label: "Istirahat",
    className:
      "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/30",
  },
  tidak_aktif: {
    label: "Tidak Aktif",
    className:
      "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/30",
  },
};

const tripStatusConfig = {
  selesai: {
    label: "Selesai",
    className:
      "bg-green-100 text-green-700 border-green-300 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30",
  },
  dalam_perjalanan: {
    label: "Dalam Perjalanan",
    className:
      "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30",
  },
  terjadwal: {
    label: "Terjadwal",
    className:
      "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/30",
  },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
      <span className="text-sm font-medium text-gray-900 dark:text-white">
        {rating}
      </span>
    </div>
  );
}

export function DriverPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState<"driver" | "triplog">("driver");

  const activeDrivers = mockDrivers.filter((d) => d.status === "aktif");
  const onTrip = mockDrivers.filter((d) => d.tripHariIni > 0);
  const totalTripToday = mockDrivers.reduce((s, d) => s + d.tripHariIni, 0);
  const totalTabungBulan = mockDrivers.reduce(
    (s, d) => s + d.totalTabungBulanIni,
    0,
  );

  const filteredDrivers = mockDrivers.filter(
    (d) =>
      d.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.noKendaraan.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Driver"
        description="Kelola data driver, pantau penugasan dan log perjalanan harian."
        actions={
          <CanAccess permission={PERMISSIONS.DRIVERS_MANAGE}>
            <Button className="gap-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg shadow-purple-500/30">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Tambah Driver</span>
            </Button>
          </CanAccess>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Driver"
          value={`${mockDrivers.length} Driver`}
          change={`${activeDrivers.length} aktif hari ini`}
          changeType="positive"
          icon={UserCheck}
          iconColor="text-purple-600 dark:text-purple-400"
          iconBgColor="bg-purple-50 dark:bg-purple-500/10"
        />
        <StatsCard
          title="Sedang Bertugas"
          value={`${onTrip.length} Driver`}
          change={`${totalTripToday} trip hari ini`}
          changeType="neutral"
          icon={Truck}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBgColor="bg-blue-50 dark:bg-blue-500/10"
        />
        <StatsCard
          title="Trip Selesai Hari Ini"
          value={`${mockTripLogs.filter((t) => t.status === "selesai" && t.tanggal === "26 Mar 2026").length} Trip`}
          change="Pengiriman berhasil"
          changeType="positive"
          icon={CheckCircle2}
          iconColor="text-green-600 dark:text-green-400"
          iconBgColor="bg-green-50 dark:bg-green-500/10"
        />
        <StatsCard
          title="Total Distribusi Bulan Ini"
          value={`${totalTabungBulan.toLocaleString("id-ID")} Tabung`}
          change="Semua driver"
          changeType="positive"
          icon={TrendingUp}
          iconColor="text-cyan-600 dark:text-cyan-400"
          iconBgColor="bg-cyan-50 dark:bg-cyan-500/10"
        />
      </div>

      {/* Main Card */}
      <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-xl">
        <CardHeader className="border-b border-gray-100 dark:border-dark-700 bg-gray-50 dark:bg-dark-850">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex border border-gray-200 dark:border-dark-700 rounded-xl p-1 bg-white dark:bg-dark-900 gap-1">
              <button
                onClick={() => setActiveView("driver")}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all",
                  activeView === "driver"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-800",
                )}
              >
                <UserCheck className="h-4 w-4" />
                Data Driver
              </button>
              <button
                onClick={() => setActiveView("triplog")}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all",
                  activeView === "triplog"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-800",
                )}
              >
                <Truck className="h-4 w-4" />
                Log Perjalanan
              </button>
            </div>

            <div className="relative sm:ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={
                  activeView === "driver"
                    ? "Cari nama atau plat..."
                    : "Cari driver..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-56 bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600 text-sm"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {activeView === "driver" ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-dark-850 hover:bg-gray-50 dark:hover:bg-dark-850 border-b border-gray-200 dark:border-dark-700">
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                      Driver
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                      Kendaraan
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-center">
                      Kapasitas
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-center">
                      Trip Hari Ini
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-right">
                      Distribusi Bln Ini
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-center">
                      Rating
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
                  {filteredDrivers.map((driver) => {
                    const conf = driverStatusConfig[driver.status];
                    return (
                      <TableRow
                        key={driver.id}
                        className="border-b border-gray-100 dark:border-dark-700 hover:bg-purple-50/30 dark:hover:bg-purple-500/5 transition-colors"
                      >
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                              {driver.nama.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {driver.nama}
                              </p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Phone className="h-3 w-3 text-gray-400" />
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {driver.noHP}
                                </p>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <p className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                            {driver.noKendaraan}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {driver.jenisKendaraan}
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {driver.kapasitas}
                          </span>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            tabung
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {driver.tripHariIni > 0 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold">
                                {driver.tripHariIni}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400 dark:text-gray-500">
                                0
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <p className="font-bold text-gray-900 dark:text-white">
                            {driver.totalTabungBulanIni.toLocaleString("id-ID")}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            tabung
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <StarRating rating={driver.ratingKinerja} />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs font-medium",
                              conf.className,
                            )}
                          >
                            {conf.label}
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
                            <CanAccess permission={PERMISSIONS.DRIVERS_MANAGE}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7 border-purple-300 dark:border-purple-500/30 text-purple-700 dark:text-purple-400 hover:bg-purple-50"
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
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-dark-850 hover:bg-gray-50 dark:hover:bg-dark-850 border-b border-gray-200 dark:border-dark-700">
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                      Surat Jalan
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                      Driver
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                      Tujuan Pangkalan
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-right">
                      Jumlah
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-center">
                      Berangkat
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-center">
                      Tiba
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-center">
                      Durasi
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockTripLogs
                    .filter((t) =>
                      t.driver
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()),
                    )
                    .map((trip) => {
                      const conf = tripStatusConfig[trip.status];
                      return (
                        <TableRow
                          key={trip.id}
                          className="border-b border-gray-100 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700/30"
                        >
                          <TableCell className="px-4 py-3">
                            <p className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
                              {trip.noSJ}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {trip.tanggal}
                            </p>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {trip.driver}
                            </p>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                              <span className="text-sm text-gray-900 dark:text-white">
                                {trip.pangkalan}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            <p className="font-bold text-gray-900 dark:text-white">
                              {trip.jumlah}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              tabung
                            </p>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {trip.berangkat}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            {trip.tiba ? (
                              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                {trip.tiba}
                              </span>
                            ) : trip.status === "dalam_perjalanan" ? (
                              <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400">
                                <Clock className="h-3.5 w-3.5 animate-pulse" />
                                <span className="text-xs">En route</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400 dark:text-gray-500">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {trip.durasi ?? "—"}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs font-medium",
                                conf.className,
                              )}
                            >
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
        </CardContent>
      </Card>

      {/* Mobile-friendly note */}
      <Card className="border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                Aplikasi Mobile Driver
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                Driver dapat memperbarui status perjalanan secara real-time
                melalui aplikasi mobile GasDistrib. Muat halaman ini pada
                perangkat mobile untuk melihat tampilan yang dioptimalkan untuk
                driver.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
