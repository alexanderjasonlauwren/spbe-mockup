import { TrendingUp, Package, MapPin, AlertCircle } from "lucide-react";
import { useDashboard } from "@/features/dashboard/hooks/useDashboard";
import { KpiCard } from "@/features/dashboard/components/KpiCard";
import { MonthlyBarChart } from "@/features/dashboard/components/MonthlyBarChart";
import { PangkalanDonutChart } from "@/features/dashboard/components/PangkalanDonutChart";
import { RecentActivityTable } from "@/features/dashboard/components/RecentActivityTable";
import { formatPercent } from "@/lib/utils";

export function DashboardPage() {
  const { kpi, monthlyChart, pangkalanShares, recentActivities, isLoading } =
    useDashboard();

  const quotaPct = kpi
    ? (kpi.monthlyQuotaRemaining / kpi.monthlyQuotaTotal) * 100
    : 65;

  const dailyPct = kpi ? (kpi.dailyDistributed / kpi.dailyTarget) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Distribusi Hari Ini"
          value={
            isLoading
              ? "—"
              : `${kpi?.dailyDistributed.toLocaleString("id-ID")} Tabung`
          }
          subtitle="+12% vs Kemarin"
          progressValue={dailyPct}
          icon={TrendingUp}
          variant="blue"
        />
        <KpiCard
          title="Sisa Kuota"
          value={
            isLoading
              ? "—"
              : `${kpi?.monthlyQuotaRemaining.toLocaleString("id-ID")} Tabung`
          }
          subtitle={`${formatPercent(quotaPct)} Tersisa dari total kuota bulanan`}
          progressValue={quotaPct}
          icon={Package}
          variant="amber"
        />
        <KpiCard
          title="Pangkalan Aktif"
          value={isLoading ? "—" : `${kpi?.activePangkalan} Entitas`}
          subtitle={`Dari total ${kpi?.totalPangkalan} pangkalan terdaftar`}
          icon={MapPin}
          variant="green"
        />
        <KpiCard
          title="Pembayaran Pending"
          value={isLoading ? "—" : `${kpi?.pendingPayments} Faktur`}
          subtitle="Memerlukan Verifikasi Segera"
          icon={AlertCircle}
          variant="red"
          showWarning
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Monthly Bar Chart */}
        <div className="lg:col-span-6 bg-surface-container-lowest p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
              Progres Distribusi Bulanan
            </h3>
            <span className="text-xs font-semibold bg-surface-container-low px-3 py-1.5 rounded-lg text-on-surface-variant">
              Mei 2026
            </span>
          </div>
          {isLoading ? (
            <div className="h-[280px] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-[#1565C0] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <MonthlyBarChart data={monthlyChart} />
          )}
        </div>

        {/* Donut Chart */}
        <div className="lg:col-span-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-6">
            Distribusi per Wilayah
          </h3>
          {isLoading ? (
            <div className="h-[200px] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-[#1565C0] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <PangkalanDonutChart data={pangkalanShares} />
          )}
        </div>
      </div>

      {/* Recent Activities Table */}
      <RecentActivityTable data={recentActivities} isLoading={isLoading} />
    </div>
  );
}
