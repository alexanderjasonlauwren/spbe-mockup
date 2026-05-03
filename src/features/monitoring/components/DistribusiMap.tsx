import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { getInitials } from "@/lib/utils";
import { getStatusVariant } from "@/components/common/StatusBadge";
import type { DriverCard, MonitoringAssignment, MonitoringRow } from "../types";

// Fix default marker icons broken by bundlers.
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type Coord = [number, number];

type RouteMap = Record<string, Coord[]>;

function colorForVariant(variant: ReturnType<typeof getStatusVariant>) {
  if (variant === "success") return "#10B981";
  if (variant === "process") return "#1565C0";
  if (variant === "warning") return "#F59E0B";
  if (variant === "danger") return "#EF4444";
  return "#64748B";
}

function makeDriverIcon(initials: string, isSelected: boolean) {
  const ring = isSelected ? "0 0 0 4px rgba(21,101,192,.22)" : "none";
  return L.divIcon({
    className: "",
    html: `<div style="
      background:#1565C0;
      color:white;
      border:2px solid white;
      border-radius:9999px;
      width:34px;height:34px;
      display:flex;align-items:center;justify-content:center;
      font-size:10px;font-weight:800;
      letter-spacing:.02em;
      box-shadow:0 4px 12px rgba(0,0,0,0.22), ${ring};
    ">${initials}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
}

function makePangkalanIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:16px;height:16px;border-radius:9999px;
      background:${color};
      border:2px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,.28);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function FitBounds({ points }: { points: Coord[] }) {
  const map = useMap();
  const hasFitted = useRef(false);
  useEffect(() => {
    if (!points.length || hasFitted.current) return;
    hasFitted.current = true;
    map.fitBounds(points, { padding: [36, 36] });
  }, [map, points]);
  return null;
}

interface DistribusiMapProps {
  height?: string;
  drivers: DriverCard[];
  rows: MonitoringRow[];
  assignments: MonitoringAssignment[];
  selectedDriverId?: string;
  onSelectDriver?: (id: string) => void;
}

export function DistribusiMap({
  height = "360px",
  drivers,
  rows,
  assignments,
  selectedDriverId,
  onSelectDriver,
}: DistribusiMapProps) {
  const [routesByAssignmentId, setRoutesByAssignmentId] = useState<RouteMap>(
    {},
  );

  const points = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        coord: [r.coord.lat, r.coord.lng] as Coord,
        color: colorForVariant(getStatusVariant(r.status)),
      })),
    [rows],
  );

  const resolvedAssignments = useMemo(() => {
    const rowById = new Map(points.map((row) => [row.id, row]));
    const driverById = new Map(drivers.map((driver) => [driver.id, driver]));
    return assignments
      .map((assignment) => {
        const driver = driverById.get(assignment.driverId);
        const target = rowById.get(assignment.pangkalanId);
        if (!driver || !target) return null;
        return {
          assignment,
          driver,
          target,
          driverCoord: [
            assignment.driverCoord.lat,
            assignment.driverCoord.lng,
          ] as Coord,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [assignments, drivers, points]);

  useEffect(() => {
    let cancelled = false;

    async function loadRoutes() {
      const entries = await Promise.all(
        resolvedAssignments.map(async (a) => {
          const from = a.driverCoord;
          const to = a.target.coord;
          const fallback: Coord[] = [from, to];

          try {
            const url =
              "https://router.project-osrm.org/route/v1/driving/" +
              `${from[1]},${from[0]};${to[1]},${to[0]}` +
              "?overview=full&geometries=geojson";

            const response = await fetch(url);
            if (!response.ok) {
              return [a.assignment.id, fallback] as const;
            }

            const data = (await response.json()) as {
              routes?: Array<{ geometry?: { coordinates?: number[][] } }>;
            };

            const coordinates = data.routes?.[0]?.geometry?.coordinates;
            if (!coordinates?.length) {
              return [a.assignment.id, fallback] as const;
            }

            const routeCoords: Coord[] = coordinates.map(([lng, lat]) => [
              lat,
              lng,
            ]);
            return [a.assignment.id, routeCoords] as const;
          } catch {
            return [a.assignment.id, fallback] as const;
          }
        }),
      );

      if (!cancelled) {
        setRoutesByAssignmentId(Object.fromEntries(entries));
      }
    }

    if (resolvedAssignments.length) {
      loadRoutes();
    } else {
      setRoutesByAssignmentId({});
    }

    return () => {
      cancelled = true;
    };
  }, [resolvedAssignments]);

  const activeDrivers = drivers.filter((d) => d.status !== "Selesai").length;
  const selected =
    resolvedAssignments.find((a) => a.driver.id === selectedDriverId) ??
    resolvedAssignments[0];

  const fitPoints: Coord[] = [
    ...resolvedAssignments.map((a) => a.driverCoord),
    ...points.map((p) => p.coord),
  ];

  return (
    <div
      className="relative rounded-xl overflow-hidden shadow-sm border border-outline-variant/30"
      style={{ height }}
    >
      <MapContainer
        center={[-6.236, 107.006]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        zoomControl
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={fitPoints} />

        {points.map((p) => (
          <Marker
            key={p.pangkalan}
            position={p.coord}
            icon={makePangkalanIcon(p.color)}
          >
            <Popup>
              <div className="text-xs space-y-1 min-w-[160px]">
                <p className="font-bold text-sm">{p.pangkalan}</p>
                <p className="text-slate-500">{p.alamat}</p>
                <p className="text-slate-500">Status: {p.status}</p>
                <p className="text-slate-500">
                  Realisasi: {p.realisasi.toLocaleString("id-ID")} /{" "}
                  {p.target.toLocaleString("id-ID")} tabung
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {resolvedAssignments.map((a) => {
          const isActive = a.driver.status === "Dalam Perjalanan";
          const isSelesai = a.driver.status === "Selesai";
          const routeColor = isSelesai
            ? "#10B981"
            : isActive
              ? "#1565C0"
              : "#94A3B8";
          const routePositions = routesByAssignmentId[a.assignment.id] ?? [
            a.driverCoord,
            a.target.coord,
          ];

          return (
            <div key={a.driver.id}>
              {/* White halo — ensures the route pops against any map tile */}
              {a.target && (
                <Polyline
                  positions={routePositions}
                  pathOptions={{
                    color: "#ffffff",
                    weight: 7,
                    opacity: 0.85,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                />
              )}
              {/* Colored route on top */}
              {a.target && (
                <Polyline
                  positions={routePositions}
                  pathOptions={{
                    color: routeColor,
                    weight: 3.5,
                    opacity: 1,
                    lineCap: "round",
                    lineJoin: "round",
                    dashArray: isSelesai ? undefined : "10 8",
                    className: isActive ? "route-animated" : undefined,
                  }}
                />
              )}
              <Marker
                position={a.driverCoord}
                icon={makeDriverIcon(
                  getInitials(a.driver.name),
                  selectedDriverId === a.driver.id,
                )}
                eventHandlers={{
                  click: () => onSelectDriver?.(a.driver.id),
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1 min-w-[170px]">
                    <p className="font-bold text-sm">{a.driver.name}</p>
                    <p className="text-slate-500">
                      {a.driver.armada} • {a.driver.plat}
                    </p>
                    <p className="text-slate-500">Status: {a.driver.status}</p>
                    <p className="text-slate-500">
                      Tujuan: {a.target?.pangkalan ?? "-"}
                    </p>
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}
      </MapContainer>

      <div className="absolute top-4 left-4 z-[400] flex items-center gap-2 pointer-events-none">
        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-white/95 px-3 py-1.5 rounded-full shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {activeDrivers} Driver Aktif
        </span>
        <span className="text-xs font-bold text-on-surface-variant bg-white/95 px-3 py-1.5 rounded-full shadow-sm uppercase tracking-tight">
          {rows.length} Pangkalan
        </span>
      </div>

      {selected && (
        <div className="absolute bottom-4 left-4 z-[400] bg-white/95 rounded-lg px-3.5 py-2.5 shadow-sm border border-slate-200 min-w-[220px]">
          <p className="text-[11px] font-black text-on-surface-variant uppercase tracking-wider">
            Driver Terpilih
          </p>
          <p className="text-sm font-bold text-on-surface mt-0.5">
            {selected.driver.name}
          </p>
          <p className="text-xs text-on-surface-variant">
            {selected.driver.status} • Tujuan:{" "}
            {selected.target?.pangkalan ?? "-"}
          </p>
        </div>
      )}
    </div>
  );
}
