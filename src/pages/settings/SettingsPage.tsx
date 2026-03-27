import React from "react";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Building2,
  Bell,
  Shield,
  Save,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Key,
} from "lucide-react";

type SettingsTab = "profil" | "cabang" | "notifikasi" | "keamanan";

interface Branch {
  id: string;
  nama: string;
  kode: string;
  alamat: string;
  kota: string;
  penanggungJawab: string;
  noHP: string;
  status: "aktif" | "nonaktif";
  jumlahDriver: number;
  jumlahPangkalan: number;
}

interface NotifSetting {
  id: string;
  kategori: string;
  deskripsi: string;
  email: boolean;
  push: boolean;
  sms: boolean;
}

const mockBranches: Branch[] = [
  { id: "1", nama: "Kantor Pusat Jakarta", kode: "JKT-01", alamat: "Jl. Gatot Subroto No. 45, Jakarta Selatan", kota: "Jakarta", penanggungJawab: "Budi Hartono", noHP: "021-555-0101", status: "aktif", jumlahDriver: 4, jumlahPangkalan: 15 },
  { id: "2", nama: "Cabang Depok", kode: "DPK-01", alamat: "Jl. Margonda Raya No. 201, Depok", kota: "Depok", penanggungJawab: "Ahmad Fauzi", noHP: "021-555-0202", status: "aktif", jumlahDriver: 2, jumlahPangkalan: 8 },
  { id: "3", nama: "Cabang Bogor", kode: "BGR-01", alamat: "Jl. Pajajaran No. 78, Bogor", kota: "Bogor", penanggungJawab: "Siti Nurjanah", noHP: "0251-555-0303", status: "aktif", jumlahDriver: 1, jumlahPangkalan: 5 },
];

const mockNotifSettings: NotifSetting[] = [
  { id: "1", kategori: "Kuota SA", deskripsi: "Notifikasi ketika sisa kuota SA di bawah 10%", email: true, push: true, sms: false },
  { id: "2", kategori: "SA Baru", deskripsi: "Pengingat untuk mengunduh SA baru dari SPBE", email: true, push: true, sms: true },
  { id: "3", kategori: "Pembayaran Pending", deskripsi: "Notifikasi pembayaran yang belum diverifikasi lebih dari 24 jam", email: true, push: false, sms: false },
  { id: "4", kategori: "Rencana Distribusi", deskripsi: "Pengingat membuat rencana distribusi harian (setiap pagi)", email: false, push: true, sms: false },
  { id: "5", kategori: "Driver Tidak Lapor", deskripsi: "Alert ketika driver tidak memperbarui status setelah 2 jam", email: false, push: true, sms: true },
  { id: "6", kategori: "Laporan Harian", deskripsi: "Ringkasan distribusi harian dikirim setiap sore", email: true, push: false, sms: false },
];

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none",
        checked ? "bg-blue-600" : "bg-gray-300 dark:bg-dark-600",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profil");
  const [notifSettings, setNotifSettings] = useState(mockNotifSettings);

  const tabs: { key: SettingsTab; label: string; icon: React.ElementType }[] = [
    { key: "profil", label: "Profil Toko", icon: Building2 },
    { key: "cabang", label: "Cabang", icon: MapPin },
    { key: "notifikasi", label: "Notifikasi", icon: Bell },
    { key: "keamanan", label: "Keamanan", icon: Shield },
  ];

  const toggleNotif = (id: string, field: "email" | "push" | "sms") => {
    setNotifSettings((prev) =>
      prev.map((n) => (n.id === id ? { ...n, [field]: !n[field] } : n)),
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan"
        description="Konfigurasi sistem distribusi LPG, kelola cabang, dan atur preferensi notifikasi."
      />

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-all",
              activeTab === tab.key
                ? "bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-700 shadow-sm"
                : "bg-white dark:bg-dark-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-dark-600 hover:border-slate-400 dark:hover:border-slate-500",
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* PROFIL TOKO */}
      {activeTab === "profil" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800">
              <CardHeader className="border-b border-gray-100 dark:border-dark-700">
                <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                  Informasi Perusahaan
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nama Perusahaan</Label>
                    <Input defaultValue="PT. GasDistrib Nusantara" className="bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">No. SPBE / ID Distributor</Label>
                    <Input defaultValue="SPBE-2024-0001" className="bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Alamat Lengkap</Label>
                  <Textarea
                    defaultValue="Jl. Gatot Subroto No. 45, Kel. Kuningan Barat, Kec. Mampang Prapatan, Jakarta Selatan 12710"
                    rows={3}
                    className="bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Phone className="h-3.5 w-3.5 inline mr-1" />
                      No. Telepon
                    </Label>
                    <Input defaultValue="021-555-0100" className="bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Mail className="h-3.5 w-3.5 inline mr-1" />
                      Email
                    </Label>
                    <Input defaultValue="info@gasdistrib.id" className="bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Globe className="h-3.5 w-3.5 inline mr-1" />
                      Website
                    </Label>
                    <Input defaultValue="www.gasdistrib.id" className="bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800">
              <CardHeader className="border-b border-gray-100 dark:border-dark-700">
                <CardTitle className="text-base font-bold text-gray-900 dark:text-white">
                  Pengaturan Operasional
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Jam Mulai Operasional</Label>
                    <Input type="time" defaultValue="06:00" className="bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Jam Selesai Operasional</Label>
                    <Input type="time" defaultValue="17:00" className="bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Threshold Alert Kuota SA (%)</Label>
                    <Input type="number" defaultValue="10" min="1" max="50" className="bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Alert dikirim ketika sisa kuota di bawah nilai ini</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Batas Waktu Verifikasi Bayar (Jam)</Label>
                    <Input type="number" defaultValue="24" min="1" max="72" className="bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Alert dikirim jika melewati batas waktu ini</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800">
              <CardHeader className="border-b border-gray-100 dark:border-dark-700 pb-3">
                <CardTitle className="text-sm font-bold text-gray-900 dark:text-white">Logo Perusahaan</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                    <span className="text-white font-bold text-2xl">LPG</span>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs gap-1 border-gray-300 dark:border-dark-600 w-full">
                    Ganti Logo
                  </Button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">PNG, JPG (max 2MB). Ukuran optimal: 200×200px</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Status Sistem</p>
                {[
                  { label: "Koneksi SPBE", status: true },
                  { label: "Database", status: true },
                  { label: "Email Service", status: true },
                  { label: "Push Notification", status: false },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{s.label}</span>
                    {s.status ? (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs">Online</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-red-500 dark:text-red-400">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-xs">Offline</span>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <CanAccess permission={PERMISSIONS.SETTINGS_EDIT}>
              <Button className="w-full gap-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white">
                <Save className="h-4 w-4" />
                Simpan Perubahan
              </Button>
            </CanAccess>
          </div>
        </div>
      )}

      {/* CABANG */}
      {activeTab === "cabang" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{mockBranches.length} cabang terdaftar</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{mockBranches.filter(b => b.status === "aktif").length} aktif</p>
            </div>
            <CanAccess permission={PERMISSIONS.SETTINGS_EDIT}>
              <Button className="gap-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm">
                <Plus className="h-4 w-4" />
                Tambah Cabang
              </Button>
            </CanAccess>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {mockBranches.map((branch) => (
              <Card key={branch.id} className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-500/20 flex items-center justify-center shrink-0">
                        <Building2 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{branch.nama}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{branch.kode}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        branch.status === "aktif"
                          ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30"
                          : "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/30",
                      )}
                    >
                      {branch.status === "aktif" ? "Aktif" : "Non-aktif"}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{branch.alamat}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <p className="text-xs text-gray-600 dark:text-gray-400">{branch.noHP}</p>
                    </div>
                  </div>

                  <Separator className="my-3 dark:bg-dark-700" />

                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{branch.jumlahDriver}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Driver</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{branch.jumlahPangkalan}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Pangkalan</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{branch.jumlahDriver + branch.jumlahPangkalan}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 border-gray-300 dark:border-dark-600">
                      <Edit className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs gap-1 border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-400 hover:bg-red-50">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* NOTIFIKASI */}
      {activeTab === "notifikasi" && (
        <div className="space-y-4">
          <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800">
            <CardHeader className="border-b border-gray-100 dark:border-dark-700">
              <CardTitle className="text-base font-bold text-gray-900 dark:text-white">Preferensi Notifikasi</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">Atur cara menerima pemberitahuan sistem.</p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-dark-850 hover:bg-gray-50 dark:hover:bg-dark-850 border-b border-gray-200 dark:border-dark-700">
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">Kategori</TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-center">Email</TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-center">Push</TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-center">SMS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifSettings.map((notif) => (
                    <TableRow key={notif.id} className="border-b border-gray-100 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700/30">
                      <TableCell className="px-4 py-4">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{notif.kategori}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{notif.deskripsi}</p>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-center">
                        <ToggleSwitch
                          checked={notif.email}
                          onChange={() => toggleNotif(notif.id, "email")}
                        />
                      </TableCell>
                      <TableCell className="px-4 py-4 text-center">
                        <ToggleSwitch
                          checked={notif.push}
                          onChange={() => toggleNotif(notif.id, "push")}
                        />
                      </TableCell>
                      <TableCell className="px-4 py-4 text-center">
                        <ToggleSwitch
                          checked={notif.sms}
                          onChange={() => toggleNotif(notif.id, "sms")}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <CanAccess permission={PERMISSIONS.SETTINGS_EDIT}>
            <div className="flex justify-end">
              <Button className="gap-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white">
                <Save className="h-4 w-4" />
                Simpan Preferensi Notifikasi
              </Button>
            </div>
          </CanAccess>
        </div>
      )}

      {/* KEAMANAN */}
      {activeTab === "keamanan" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Change Password */}
          <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800">
            <CardHeader className="border-b border-gray-100 dark:border-dark-700">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <CardTitle className="text-base font-bold text-gray-900 dark:text-white">Ubah Password</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password Saat Ini</Label>
                <Input type="password" placeholder="••••••••" className="bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password Baru</Label>
                <Input type="password" placeholder="Min. 8 karakter" className="bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Konfirmasi Password Baru</Label>
                <Input type="password" placeholder="Ulangi password baru" className="bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600" />
              </div>

              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-700/50 border border-gray-200 dark:border-dark-600">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Persyaratan Password</p>
                {[
                  "Minimal 8 karakter",
                  "Kombinasi huruf besar dan kecil",
                  "Minimal 1 angka",
                  "Minimal 1 karakter spesial (!@#$%)",
                ].map((req) => (
                  <div key={req} className="flex items-center gap-2 mt-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{req}</span>
                  </div>
                ))}
              </div>

              <Button className="w-full gap-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white">
                <Lock className="h-4 w-4" />
                Ubah Password
              </Button>
            </CardContent>
          </Card>

          {/* Session & API */}
          <div className="space-y-4">
            <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800">
              <CardHeader className="border-b border-gray-100 dark:border-dark-700">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <CardTitle className="text-base font-bold text-gray-900 dark:text-white">API Configuration</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">API URL</Label>
                  <Input defaultValue="http://localhost:3000/api" className="font-mono text-sm bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">SPBE Portal URL</Label>
                  <Input defaultValue="https://portal.pertamina.com/spbe" className="font-mono text-sm bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm text-green-700 dark:text-green-400">Koneksi API Aktif</span>
                  </div>
                  <span className="text-xs text-green-600 dark:text-green-500">v1.0.0</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800">
              <CardHeader className="border-b border-gray-100 dark:border-dark-700 pb-3">
                <CardTitle className="text-base font-bold text-gray-900 dark:text-white">Sesi Aktif</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {[
                  { device: "Chrome — Windows", ip: "192.168.1.10", waktu: "Sekarang", current: true },
                  { device: "Safari — iPhone", ip: "192.168.1.20", waktu: "2 jam lalu", current: false },
                ].map((session, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-dark-700">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{session.device}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{session.ip} • {session.waktu}</p>
                    </div>
                    {session.current ? (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30">
                        Saat Ini
                      </Badge>
                    ) : (
                      <Button size="sm" variant="outline" className="text-xs h-7 border-red-300 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50">
                        Keluar
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800 dark:text-red-300">Zona Berbahaya</p>
                    <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">Hapus semua data dan nonaktifkan akun. Tindakan ini tidak dapat dibatalkan.</p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0 border-red-400 text-red-700 dark:text-red-400 hover:bg-red-100 text-xs">
                    Hapus Akun
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
