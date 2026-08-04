import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDeskMutation } from "@/hooks/useDeskMutation";
import {
  getMonitoringSnapshot,
  printSuratJalan,
  setDeliveryStatus,
} from "../api/monitoringApi";

function todayStr() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function useMonitoring() {
  const [dateRange, setDateRange] = useState({ from: todayStr(), to: todayStr() });
  const [driverFilter, setDriverFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("Semua");

  const snapshot = useQuery({
    queryKey: ["monitoring-snapshot", dateRange],
    queryFn: () => getMonitoringSnapshot(dateRange),
    // The board is the one screen people leave open, so it refreshes itself.
    refetchInterval: 30_000,
  });

  const statusMutation = useDeskMutation({
    mutationFn: setDeliveryStatus,
    errorTitle: "Gagal memperbarui surat jalan",
    success: (delivery) => ({
      title: `${delivery.kode} → ${delivery.status}`,
      description:
        delivery.status === "Selesai"
          ? `Realisasi ${delivery.realisasi.toLocaleString("id-ID")} tabung. Tagihan otomatis diterbitkan untuk verifikasi keuangan.`
          : undefined,
    }),
  });

  const printMutation = useDeskMutation({
    mutationFn: (deliveryId: string) => printSuratJalan(deliveryId),
    errorTitle: "Cetak surat jalan gagal",
  });

  const rows = (snapshot.data?.rows ?? []).filter((r) => {
    if (driverFilter && r.driverId !== driverFilter) return false;
    if (statusFilter !== "Semua" && r.status !== statusFilter) return false;
    return true;
  });

  return {
    driverCards: snapshot.data?.drivers ?? [],
    monitoringTable: rows,
    allRows: snapshot.data?.rows ?? [],
    assignments: snapshot.data?.assignments ?? [],
    totals: snapshot.data?.totals,
    lastSyncAt: snapshot.data?.lastSyncAt,
    isLoading: snapshot.isLoading,
    isFetching: snapshot.isFetching,
    isError: snapshot.isError,
    error: snapshot.error as Error | null,
    refetch: snapshot.refetch,
    dateRange,
    setDateRange,
    driverFilter,
    setDriverFilter,
    statusFilter,
    setStatusFilter,
    statusMutation,
    printMutation,
  };
}
