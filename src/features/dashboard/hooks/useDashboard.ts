import { scopeKey } from "@/mocks/scope";
import { useQuery } from "@tanstack/react-query";
import {
  getDispatchRail,
  getKpiSummary,
  getMonthlyChart,
  getPangkalanShares,
  getRecentActivities,
  getRecentAudit,
} from "../api/dashboardApi";

export function useDashboard() {
  const kpi = useQuery({ queryKey: [...scopeKey(), "kpi"], queryFn: getKpiSummary });
  const rail = useQuery({ queryKey: [...scopeKey(), "dispatch-rail"], queryFn: getDispatchRail });
  const monthlyChart = useQuery({
    queryKey: [...scopeKey(), "monthly-chart"],
    queryFn: getMonthlyChart,
  });
  const pangkalanShares = useQuery({
    queryKey: [...scopeKey(), "pangkalan-shares"],
    queryFn: getPangkalanShares,
  });
  const recentActivities = useQuery({
    queryKey: [...scopeKey(), "recent-activities"],
    queryFn: getRecentActivities,
  });
  const audit = useQuery({ queryKey: [...scopeKey(), "recent-audit"], queryFn: () => getRecentAudit(6) });

  return {
    kpi: kpi.data,
    rail: rail.data,
    monthlyChart: monthlyChart.data ?? [],
    pangkalanShares: pangkalanShares.data ?? [],
    recentActivities: recentActivities.data ?? [],
    audit: audit.data ?? [],
    isLoading: kpi.isLoading || rail.isLoading,
    isLoadingCharts: monthlyChart.isLoading || pangkalanShares.isLoading,
    isLoadingActivities: recentActivities.isLoading,
    isError: kpi.isError || rail.isError,
    error: (kpi.error ?? rail.error) as Error | null,
    refetch: () => {
      void kpi.refetch();
      void rail.refetch();
      void monthlyChart.refetch();
      void pangkalanShares.refetch();
      void recentActivities.refetch();
      void audit.refetch();
    },
  };
}
