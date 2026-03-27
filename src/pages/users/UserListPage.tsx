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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CanAccess } from "@/features/rbac/components/CanAccess";
import { PERMISSIONS } from "@/features/rbac/permissions";
import { cn } from "@/lib/utils";
import {
  Users,
  Plus,
  Search,
  UserCheck,
  Shield,
  Settings,
  Truck,
  CreditCard,
  Mail,
  Building2,
} from "lucide-react";

interface UserRecord {
  id: string;
  nama: string;
  email: string;
  role: "admin" | "manager" | "finance" | "driver" | "staff";
  cabang: string;
  status: "aktif" | "nonaktif";
  bergabungSejak: string;
  terakhirLogin: string;
  avatar?: string;
}

const mockUsers: UserRecord[] = [
  { id: "1", nama: "Alex Lawrence", email: "alex@gasdistrib.id", role: "admin", cabang: "Pusat - Jakarta", status: "aktif", bergabungSejak: "Jan 2024", terakhirLogin: "Hari ini, 09:15", avatar: "" },
  { id: "2", nama: "Budi Hartono", email: "budi@gasdistrib.id", role: "manager", cabang: "Pusat - Jakarta", status: "aktif", bergabungSejak: "Mar 2024", terakhirLogin: "Hari ini, 08:30" },
  { id: "3", nama: "Siti Rahayu", email: "siti@gasdistrib.id", role: "finance", cabang: "Pusat - Jakarta", status: "aktif", bergabungSejak: "Feb 2024", terakhirLogin: "Kemarin, 16:45" },
  { id: "4", nama: "Ahmad Fauzi", email: "ahmad@gasdistrib.id", role: "finance", cabang: "Cabang Depok", status: "aktif", bergabungSejak: "Jun 2024", terakhirLogin: "Hari ini, 10:00" },
  { id: "5", nama: "Budi Santoso", email: "budi.s@gasdistrib.id", role: "driver", cabang: "Pusat - Jakarta", status: "aktif", bergabungSejak: "Jan 2024", terakhirLogin: "Hari ini, 07:30" },
  { id: "6", nama: "Hendra Wijaya", email: "hendra@gasdistrib.id", role: "driver", cabang: "Pusat - Jakarta", status: "aktif", bergabungSejak: "Mar 2024", terakhirLogin: "Hari ini, 08:05" },
  { id: "7", nama: "Ahmad Yani", email: "ahmad.y@gasdistrib.id", role: "driver", cabang: "Cabang Depok", status: "aktif", bergabungSejak: "Nov 2023", terakhirLogin: "Hari ini, 08:30" },
  { id: "8", nama: "Slamet Riyadi", email: "slamet@gasdistrib.id", role: "driver", cabang: "Pusat - Jakarta", status: "aktif", bergabungSejak: "Aug 2023", terakhirLogin: "Hari ini, 07:00" },
  { id: "9", nama: "Eko Prasetyo", email: "eko@gasdistrib.id", role: "driver", cabang: "Cabang Bogor", status: "aktif", bergabungSejak: "Jun 2025", terakhirLogin: "26 Mar 2026" },
  { id: "10", nama: "Dewi Kusuma", email: "dewi@gasdistrib.id", role: "staff", cabang: "Cabang Bogor", status: "nonaktif", bergabungSejak: "Sep 2024", terakhirLogin: "5 Mar 2026" },
];

const roleConfig = {
  admin: { label: "Administrator", className: "bg-red-100 text-red-700 border-red-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30", icon: Shield },
  manager: { label: "Manajer", className: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30", icon: UserCheck },
  finance: { label: "Keuangan", className: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30", icon: CreditCard },
  driver: { label: "Driver", className: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30", icon: Truck },
  staff: { label: "Staff", className: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/30", icon: Settings },
};

export function UserListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = mockUsers.filter((u) => {
    const matchesSearch =
      u.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalUsers = mockUsers.length;
  const admins = mockUsers.filter(u => u.role === "admin" || u.role === "manager").length;
  const financeStaff = mockUsers.filter(u => u.role === "finance").length;
  const drivers = mockUsers.filter(u => u.role === "driver").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Pengguna"
        description="Kelola pengguna sistem dan atur hak akses berbasis peran (RBAC)."
        actions={
          <CanAccess permission={PERMISSIONS.USERS_CREATE}>
            <Button className="gap-2 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white shadow-lg shadow-sky-500/30">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Tambah Pengguna</span>
            </Button>
          </CanAccess>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Pengguna"
          value={`${totalUsers} Pengguna`}
          change={`${mockUsers.filter(u => u.status === "aktif").length} aktif`}
          changeType="positive"
          icon={Users}
          iconColor="text-sky-600 dark:text-sky-400"
          iconBgColor="bg-sky-50 dark:bg-sky-500/10"
        />
        <StatsCard
          title="Admin & Manajer"
          value={`${admins} Pengguna`}
          change="Pengelola sistem"
          changeType="neutral"
          icon={Shield}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBgColor="bg-blue-50 dark:bg-blue-500/10"
        />
        <StatsCard
          title="Tim Keuangan"
          value={`${financeStaff} Pengguna`}
          change="Akses verifikasi pembayaran"
          changeType="neutral"
          icon={CreditCard}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBgColor="bg-emerald-50 dark:bg-emerald-500/10"
        />
        <StatsCard
          title="Driver Terdaftar"
          value={`${drivers} Driver`}
          change="Akses aplikasi mobile"
          changeType="positive"
          icon={Truck}
          iconColor="text-purple-600 dark:text-purple-400"
          iconBgColor="bg-purple-50 dark:bg-purple-500/10"
        />
      </div>

      {/* User Table */}
      <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-xl">
        <CardHeader className="border-b border-gray-100 dark:border-dark-700 bg-gray-50 dark:bg-dark-850">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
                Daftar Pengguna
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {filtered.length} dari {totalUsers} pengguna ditampilkan
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cari nama atau email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-56 bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600 text-sm"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-36 bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600 text-sm">
                  <SelectValue placeholder="Semua Peran" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-dark-800">
                  <SelectItem value="all">Semua Peran</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manajer</SelectItem>
                  <SelectItem value="finance">Keuangan</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32 bg-white dark:bg-dark-900 border-gray-300 dark:border-dark-600 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-dark-800">
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="nonaktif">Non-aktif</SelectItem>
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
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">Pengguna</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">Peran</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">Cabang</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">Bergabung</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">Terakhir Login</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300">Status</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold uppercase text-gray-700 dark:text-gray-300 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => {
                  const roleConf = roleConfig[user.role];
                  const RoleIcon = roleConf.icon;
                  return (
                    <TableRow key={user.id} className="border-b border-gray-100 dark:border-dark-700 hover:bg-sky-50/30 dark:hover:bg-sky-500/5 transition-colors">
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-sky-500 to-sky-600 text-white text-xs font-bold">
                              {user.nama.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.nama}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3 text-gray-400" />
                              <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant="outline" className={cn("flex items-center gap-1 w-fit text-xs font-medium", roleConf.className)}>
                          <RoleIcon className="h-3 w-3" />
                          {roleConf.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{user.cabang}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{user.bergabungSejak}</span>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{user.terakhirLogin}</span>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-medium",
                            user.status === "aktif"
                              ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30"
                              : "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/30",
                          )}
                        >
                          {user.status === "aktif" ? "Aktif" : "Non-aktif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <CanAccess permission={PERMISSIONS.USERS_EDIT}>
                            <Button size="sm" variant="outline" className="text-xs h-7 border-sky-300 dark:border-sky-500/30 text-sky-700 dark:text-sky-400 hover:bg-sky-50">
                              Edit
                            </Button>
                          </CanAccess>
                          <CanAccess permission={PERMISSIONS.USERS_DELETE}>
                            <Button size="sm" variant="outline" className="text-xs h-7 border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-400 hover:bg-red-50">
                              {user.status === "aktif" ? "Nonaktifkan" : "Aktifkan"}
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
