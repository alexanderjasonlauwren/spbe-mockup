import { useQuery } from "@tanstack/react-query";
import {
  getKpiSummary,
  getMonthlyChart,
  getPangkalanShares,
  getRecentActivities,
} from "../api/dashboardApi";

export function useDashboard() {
  const kpi = useQuery({
    queryKey: ["kpi"],
    queryFn: getKpiSummary,
  });

  const monthlyChart = useQuery({
    queryKey: ["monthly-chart"],
    queryFn: getMonthlyChart,
  });

  const pangkalanShares = useQuery({
    queryKey: ["pangkalan-shares"],
    queryFn: getPangkalanShares,
  });

  const recentActivities = useQuery({
    queryKey: ["recent-activities"],
    queryFn: getRecentActivities,
  });

  const isLoading =
    kpi.isLoading ||
    monthlyChart.isLoading ||
    pangkalanShares.isLoading ||
    recentActivities.isLoading;

  return {
    kpi: kpi.data,
    monthlyChart: monthlyChart.data ?? [],
    pangkalanShares: pangkalanShares.data ?? [],
    recentActivities: recentActivities.data ?? [],
    isLoading,
  };
}
