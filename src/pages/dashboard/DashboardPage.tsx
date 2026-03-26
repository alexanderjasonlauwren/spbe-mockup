import { PageHeader } from "@/components/common/pageHeader";
import { StatsCard } from "@/components/common/statsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CanAccess } from "@/features/rbac/components/CanAccess";
import { PERMISSIONS } from "@/features/rbac/permissions";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  Users,
  Package,
  TrendingUp,
  Download,
  CheckCircle2,
  Clock,
  Loader2,
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
} from "recharts";

// Type for Recharts tooltip payload
interface TooltipPayloadItem {
  value: number | string;
  name: string;
  color: string;
}

const getStatusBadge = (status: string) => {
  const statusConfig = {
    completed: {
      label: "Completed",
      icon: CheckCircle2,
      className:
        "bg-green-100 text-green-700 border-green-300 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30",
    },
    pending: {
      label: "Pending",
      icon: Clock,
      className:
        "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/30",
    },
    processing: {
      label: "Processing",
      icon: Loader2,
      className:
        "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30",
    },
  };

  const config =
    statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium capitalize flex items-center gap-1.5 w-fit px-3 py-1",
        config.className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
};

// Mock data for charts
const revenueData = [
  { month: "Jan", revenue: 45000000, orders: 120 },
  { month: "Feb", revenue: 52000000, orders: 145 },
  { month: "Mar", revenue: 48000000, orders: 130 },
  { month: "Apr", revenue: 61000000, orders: 165 },
  { month: "May", revenue: 55000000, orders: 150 },
  { month: "Jun", revenue: 67000000, orders: 180 },
  { month: "Jul", revenue: 72000000, orders: 195 },
];

const categoryData = [
  { category: "Electronics", sales: 125000000 },
  { category: "Fashion", sales: 89000000 },
  { category: "Home", sales: 67000000 },
  { category: "Sports", sales: 54000000 },
  { category: "Books", sales: 32000000 },
];

const recentOrders = [
  {
    id: "ORD-001",
    customer: "Budi Santoso",
    amount: 2999000,
    status: "completed",
    date: "2026-02-22",
  },
  {
    id: "ORD-002",
    customer: "Siti Nurhaliza",
    amount: 4595000,
    status: "pending",
    date: "2026-02-22",
  },
  {
    id: "ORD-003",
    customer: "Ahmad Yani",
    amount: 1299000,
    status: "processing",
    date: "2026-02-21",
  },
  {
    id: "ORD-004",
    customer: "Dewi Lestari",
    amount: 8990000,
    status: "completed",
    date: "2026-02-21",
  },
  {
    id: "ORD-005",
    customer: "Hendra Wijaya",
    amount: 3499000,
    status: "completed",
    date: "2026-02-20",
  },
];

// Custom tooltip for dark mode
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
      <div className="bg-white dark:bg-dark-800 p-4 rounded-lg shadow-xl border border-gray-200 dark:border-dark-600">
        <p className="font-semibold text-gray-900 dark:text-white mb-2">
          {label}
        </p>
        {payload.map((item, index: number) => (
          <p key={index} className="text-sm" style={{ color: item.color }}>
            {item.name}:{" "}
            {typeof item.value === "number"
              ? formatCurrency(item.value)
              : item.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Dashboard"
        description="Selamat datang! Berikut ringkasan toko Anda hari ini."
        actions={
          <CanAccess permission={PERMISSIONS.REPORTS_VIEW}>
            <Button
              variant="outline"
              className="gap-2 border-gray-300 dark:border-dark-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-800"
            >
              <Download className="h-4 w-4" />
              <span className="text-gray-900 dark:text-white">
                Export Laporan
              </span>
            </Button>
          </CanAccess>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <CanAccess permission={PERMISSIONS.ORDERS_VIEW}>
          <StatsCard
            title="Total Pendapatan"
            value={formatCurrency(452318900)}
            change="+20.1% dari bulan lalu"
            changeType="positive"
            icon={DollarSign}
            iconColor="text-emerald-600 dark:text-emerald-400"
            iconBgColor="bg-emerald-50 dark:bg-emerald-500/10"
          />
        </CanAccess>

        <CanAccess permission={PERMISSIONS.USERS_VIEW}>
          <StatsCard
            title="Pengguna Aktif"
            value="2,345"
            change="+12.5% dari bulan lalu"
            changeType="positive"
            icon={Users}
            iconColor="text-blue-600 dark:text-blue-400"
            iconBgColor="bg-blue-50 dark:bg-blue-500/10"
          />
        </CanAccess>

        <CanAccess permission={PERMISSIONS.PRODUCTS_VIEW}>
          <StatsCard
            title="Total Produk"
            value="1,234"
            change="+5.2% dari bulan lalu"
            changeType="positive"
            icon={Package}
            iconColor="text-violet-600 dark:text-violet-400"
            iconBgColor="bg-violet-50 dark:bg-violet-500/10"
          />
        </CanAccess>

        <CanAccess permission={PERMISSIONS.ORDERS_VIEW}>
          <StatsCard
            title="Conversion Rate"
            value="3.24%"
            change="-2.1% dari bulan lalu"
            changeType="negative"
            icon={TrendingUp}
            iconColor="text-orange-600 dark:text-orange-400"
            iconBgColor="bg-orange-50 dark:bg-orange-500/10"
          />
        </CanAccess>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <CanAccess permission={PERMISSIONS.REPORTS_VIEW}>
          <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-lg">
            <CardHeader className="border-b border-gray-100 dark:border-dark-700 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
                  Grafik Pendapatan
                </CardTitle>
                <Badge
                  variant="outline"
                  className="border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-dark-700"
                >
                  7 Bulan Terakhir
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    opacity={0.1}
                  />
                  <XAxis
                    dataKey="month"
                    stroke="#9ca3af"
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: "#6b7280" }} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: "#3b82f6", r: 5 }}
                    activeDot={{ r: 7, fill: "#2563eb" }}
                    name="Pendapatan"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </CanAccess>

        {/* Category Chart */}
        <CanAccess permission={PERMISSIONS.REPORTS_VIEW}>
          <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-lg">
            <CardHeader className="border-b border-gray-100 dark:border-dark-700 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
                  Penjualan per Kategori
                </CardTitle>
                <Badge
                  variant="outline"
                  className="border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-dark-700"
                >
                  Bulan Ini
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    opacity={0.1}
                  />
                  <XAxis
                    dataKey="category"
                    stroke="#9ca3af"
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ color: "#6b7280" }} />
                  <Bar
                    dataKey="sales"
                    fill="#6366f1"
                    radius={[8, 8, 0, 0]}
                    name="Penjualan"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </CanAccess>
      </div>

      {/* Recent Orders */}
      <CanAccess permission={PERMISSIONS.ORDERS_VIEW}>
        <Card className="border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 dark:border-dark-700 pb-4">
            <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
              Pesanan Terbaru
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10"
            >
              Lihat Semua
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-700/50 hover:bg-gray-100 dark:hover:bg-dark-700 hover:border-blue-300 dark:hover:border-blue-500/50 transition-all gap-3"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">
                        {order.id}
                      </p>
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {order.customer}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {order.date}
                    </p>
                  </div>
                  <div className="text-right sm:text-right sm:ml-4">
                    <p className="font-bold text-lg text-gray-900 dark:text-white">
                      {formatCurrency(order.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </CanAccess>
    </div>
  );
}
