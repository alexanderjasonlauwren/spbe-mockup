import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMonitoringSnapshot } from "../api/monitoringApi";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function useMonitoring() {
  const [dateRange, setDateRange] = useState({
    from: todayStr(),
    to: todayStr(),
  });

  const snapshotQuery = useQuery({
    queryKey: ["monitoring-snapshot", dateRange],
    queryFn: () => getMonitoringSnapshot(dateRange),
  });

  const rowsById = new Map(
    (snapshotQuery.data?.rows ?? []).map((r) => [r.id, r]),
  );
  const targetByDriverId = new Map(
    (snapshotQuery.data?.assignments ?? []).map((a) => [
      a.driverId,
      a.pangkalanId,
    ]),
  );

  const driverCards = (snapshotQuery.data?.drivers ?? []).map((driver) => {
    const rowId = targetByDriverId.get(driver.id);
    const row = rowId ? rowsById.get(rowId) : undefined;
    return {
      ...driver,
      tujuanPangkalan: row?.pangkalan,
    };
  });

  return {
    driverCards,
    monitoringTable: snapshotQuery.data?.rows ?? [],
    assignments: snapshotQuery.data?.assignments ?? [],
    lastSyncAt: snapshotQuery.data?.lastSyncAt,
    isLoading: snapshotQuery.isLoading,
    dateRange,
    setDateRange,
  };
}
