import { useMemo, useState } from "react";
import { useMonitoring } from "@/features/monitoring/hooks/useMonitoring";
import { DateRangeFilter } from "@/features/monitoring/components/DateRangeFilter";
import { DriverCardRow } from "@/features/monitoring/components/DriverCardRow";
import { DistribusiMap } from "@/features/monitoring/components/DistribusiMap";
import { MonitoringTable } from "@/features/monitoring/components/MonitoringTable";

export function MonitoringPage() {
  const [selectedDriverId, setSelectedDriverId] = useState<
    string | undefined
  >();
  const {
    driverCards,
    monitoringTable,
    assignments,
    lastSyncAt,
    isLoading,
    dateRange,
    setDateRange,
  } = useMonitoring();

  const selesai = monitoringTable.filter((r) => r.status === "Selesai").length;
  const proses = monitoringTable.filter((r) => r.status === "Proses").length;
  const activeDrivers = driverCards.filter(
    (c) => c.status !== "Selesai",
  ).length;

  const focusedDriverId = useMemo(
    () => selectedDriverId ?? driverCards[0]?.id,
    [selectedDriverId, driverCards],
  );

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-on-surface">
            Monitoring Distribusi
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Data snapshot berdasarkan filter tanggal. Tampilan map dan status
            armada selalu sinkron.
          </p>
        </div>
        <DateRangeFilter dateRange={dateRange} onChange={setDateRange} />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Armada Aktif",
            value: activeDrivers,
          },
          {
            label: "Dalam Perjalanan",
            value: driverCards.filter((c) => c.status === "Dalam Perjalanan")
              .length,
          },
          { label: "Pangkalan Selesai", value: selesai },
          { label: "Dalam Proses", value: proses },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-surface-container-lowest rounded-xl shadow-sm p-5"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
              {stat.label}
            </p>
            <p className="text-3xl font-black text-on-surface">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Driver Cards */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">
            Status Armada
          </h2>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
              {activeDrivers} Driver Aktif
            </span>
            <span className="px-2.5 py-1 rounded-full bg-surface-container text-xs font-bold text-on-surface-variant">
              {driverCards.length} Driver Terdaftar
            </span>
          </div>
        </div>
        <DriverCardRow
          cards={driverCards}
          isLoading={isLoading}
          selectedId={focusedDriverId}
          onSelect={setSelectedDriverId}
        />
      </div>

      {/* Live Map */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-slate-100">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-on-surface">
            Live Distribution Map
          </h3>
          <div className="text-xs text-on-surface-variant">
            Terakhir sinkron:{" "}
            <span className="font-bold text-on-surface">
              {lastSyncAt
                ? new Date(lastSyncAt).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "-"}
            </span>
          </div>
        </div>
        <div className="p-4">
          <DistribusiMap
            height="420px"
            drivers={driverCards}
            rows={monitoringTable}
            assignments={assignments}
            selectedDriverId={focusedDriverId}
            onSelectDriver={setSelectedDriverId}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-slate-100">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-base font-bold text-on-surface">
            Rekapitulasi Pengiriman Pangkalan
          </h3>
        </div>
        <MonitoringTable data={monitoringTable} isLoading={isLoading} />
      </div>
    </div>
  );
}
