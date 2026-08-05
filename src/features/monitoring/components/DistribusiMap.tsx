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
import { cn, getInitials } from "@/lib/utils";
import { fleetColor } from "@/lib/chart";
import { useTheme } from "@/hooks/useTheme";
import { STATUS_HEX, getStatusVariant } from "@/lib/status";
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

/** Map marks read from the same status palette as badges and row spines. */
function colorForVariant(variant: ReturnType<typeof getStatusVariant>) {
  return STATUS_HEX[variant];
}

function makeDriverIcon(initials: string, color: string, isSelected: boolean) {
  const ring = isSelected ? "0 0 0 4px rgba(224,163,46,.45)" : "none";
  return L.divIcon({
    className: "",
    html: `<div style="
      background:${color};
      color:#ffffff;
      border:2px solid #ffffff;
      border-radius:4px;
      width:32px;height:32px;
      display:flex;align-items:center;justify-content:center;
      font-family:'IBM Plex Mono',ui-monospace,monospace;
      font-size:10px;font-weight:600;
      letter-spacing:.02em;
      box-shadow:0 4px 12px rgba(0,0,0,0.24), ${ring};
    ">${initials}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

function makePangkalanIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:14px;height:14px;border-radius:3px;
      background:${color};
      border:2px solid #ffffff;
      box-shadow:0 2px 8px rgba(0,0,0,.28);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

/**
 * Leaflet caches its container size, so collapsing the sidebar leaves the map
 * mis-sized and the tiles offset until something else forces a redraw.
 */
function ResizeWatcher() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => map.invalidateSize({ animate: false }));
    });
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [map]);
  return null;
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
  /**
   * Height as Tailwind classes, not a pixel string. A fixed inline height
   * cannot carry a breakpoint, so a desk-sized map came through unchanged on a
   * phone — 420px of a 667px screen.
   */
  heightClass?: string;
  drivers: DriverCard[];
  rows: MonitoringRow[];
  assignments: MonitoringAssignment[];
  selectedDriverId?: string;
  onSelectDriver?: (id: string) => void;
}

export function DistribusiMap({
  heightClass = "h-64 sm:h-80 lg:h-[360px]",
  drivers,
  rows,
  assignments,
  selectedDriverId,
  onSelectDriver,
}: DistribusiMapProps) {
  const { isDark } = useTheme();
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
    const pangkalanRow = new Map(points.map((row) => [row.pangkalanId, row]));
    const driverById = new Map(drivers.map((driver) => [driver.id, driver]));

    return assignments
      .map((assignment) => {
        const driver = driverById.get(assignment.driverId);
        if (!driver) return null;
        return {
          assignment,
          driver,
          target: pangkalanRow.get(assignment.pangkalanId),
          driverCoord: [
            assignment.driverCoord.lat,
            assignment.driverCoord.lng,
          ] as Coord,
          // Truck position first, then every stop still to be made.
          waypoints: [
            [assignment.driverCoord.lat, assignment.driverCoord.lng] as Coord,
            ...assignment.stops.map((s) => [s.lat, s.lng] as Coord),
          ],
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [assignments, drivers, points]);

  // Snap each round to real roads. A straight line between stops looks like a
  // sketch; the driver follows the road, so the map should too.
  useEffect(() => {
    let cancelled = false;

    async function loadRoutes() {
      const entries = await Promise.all(
        resolvedAssignments.map(async (a) => {
          const fallback = a.waypoints;
          if (a.waypoints.length < 2) return [a.assignment.id, fallback] as const;

          try {
            const path = a.waypoints.map(([lat, lng]) => `${lng},${lat}`).join(";");
            const response = await fetch(
              `https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson`,
            );
            if (!response.ok) return [a.assignment.id, fallback] as const;

            const data = (await response.json()) as {
              routes?: Array<{ geometry?: { coordinates?: number[][] } }>;
            };
            const coordinates = data.routes?.[0]?.geometry?.coordinates;
            if (!coordinates?.length) return [a.assignment.id, fallback] as const;

            return [
              a.assignment.id,
              coordinates.map(([lng, lat]) => [lat, lng] as Coord),
            ] as const;
          } catch {
            // Offline or the router is down — the straight path still shows the
            // shape of the round.
            return [a.assignment.id, fallback] as const;
          }
        }),
      );

      if (!cancelled) setRoutesByAssignmentId(Object.fromEntries(entries));
    }

    if (resolvedAssignments.length) loadRoutes();
    else setRoutesByAssignmentId({});

    return () => {
      cancelled = true;
    };
  }, [resolvedAssignments]);

  // "Berjalan" means actually on the road, not merely rostered for today.
  const activeDrivers = resolvedAssignments.filter((a) => a.assignment.berjalan).length;
  const selected =
    resolvedAssignments.find((a) => a.driver.id === selectedDriverId) ??
    resolvedAssignments[0];

  // Fit to the whole round, so the yard and the last stop are both in frame.
  const fitPoints: Coord[] = [
    ...resolvedAssignments.flatMap((a) => a.waypoints),
    ...points.map((p) => p.coord),
  ];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border border-line",
        heightClass,
      )}
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
        <ResizeWatcher />

        {points.map((p) => (
          <Marker
            key={p.id}
            position={p.coord}
            icon={makePangkalanIcon(p.color)}
          >
            <Popup>
              <div className="text-xs space-y-1 min-w-[160px]">
                <p className="font-bold text-sm">{p.pangkalan}</p>
                <p className="text-ink-muted">{p.alamat}</p>
                <p className="text-ink-muted">Status: {p.status}</p>
                <p className="text-ink-muted">
                  Realisasi: {p.realisasi.toLocaleString("id-ID")} /{" "}
                  {p.target.toLocaleString("id-ID")} tabung
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {resolvedAssignments.map((a) => {
          const { berjalan, selesai } = a.assignment;
          // Colour identifies the truck; the line style carries its progress —
          // dashed = round still to drive, animated = on the road, solid = done.
          const routeColor = fleetColor(a.driver.slot, isDark);
          const routePositions =
            routesByAssignmentId[a.assignment.id] ?? a.waypoints;

          // Dim every other round when one truck is selected.
          const dimmed = !!selectedDriverId && selectedDriverId !== a.driver.id;
          if (routePositions.length < 2) return null;

          return (
            <div key={a.driver.id}>
              {/* White halo keeps the route legible over any map tile. */}
              <Polyline
                positions={routePositions}
                pathOptions={{
                  // A halo in the opposite value keeps the route legible over
                  // any tile, light or inverted-dark.
                  color: isDark ? "#131611" : "#ffffff",
                  weight: 7.5,
                  opacity: dimmed ? 0.2 : 0.9,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
              <Polyline
                positions={routePositions}
                pathOptions={{
                  color: routeColor,
                  opacity: dimmed ? 0.28 : 1,
                  lineCap: "round",
                  lineJoin: "round",
                  weight: selesai ? 3 : 4,
                  dashArray: selesai ? undefined : berjalan ? "1 9" : "9 7",
                  className: berjalan ? "route-animated" : undefined,
                }}
              />
              <Marker
                position={a.driverCoord}
                opacity={dimmed ? 0.45 : 1}
                icon={makeDriverIcon(
                  getInitials(a.driver.name),
                  routeColor,
                  selectedDriverId === a.driver.id,
                )}
                eventHandlers={{ click: () => onSelectDriver?.(a.driver.id) }}
              >
                <Popup>
                  <div className="min-w-[180px] space-y-1 text-xs">
                    <p className="text-sm font-bold">{a.driver.name}</p>
                    <p className="text-ink-muted">
                      {a.driver.armada} • {a.driver.plat}
                    </p>
                    <p className="text-ink-muted">Status: {a.driver.status}</p>
                    <p className="text-ink-muted">
                      {selesai
                        ? "Semua pemberhentian selesai"
                        : `Tujuan berikutnya: ${a.target?.pangkalan ?? "—"}`}
                    </p>
                    <p className="text-ink-muted">
                      Sisa {a.assignment.stops.length} pemberhentian
                    </p>
                  </div>
                </Popup>
              </Marker>
            </div>
          );
        })}
      </MapContainer>

      {/* Top-right, clear of Leaflet's zoom controls in the top-left corner. */}
      <div className="pointer-events-none absolute right-3 top-3 z-[400] flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-sm border border-line bg-panel/95 px-2.5 py-1 text-2xs font-semibold text-ink">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              activeDrivers > 0 ? "bg-signal now-pulse" : "bg-draft",
            )}
            aria-hidden
          />
          {activeDrivers} armada berjalan
        </span>
        <span className="rounded-sm border border-line bg-panel/95 px-2.5 py-1 text-2xs font-semibold text-ink-muted">
          <span className="data">{rows.length}</span> pangkalan
        </span>
      </div>

      {/* Colour tells the trucks apart; the line style tells you where each one
          is in its round. */}
      <div className="pointer-events-none absolute bottom-3 right-3 z-[400] rounded-md border border-line bg-panel/95 px-3 py-2">
        <p className="label mb-1.5 text-[0.625rem] text-ink-muted">Garis rute</p>
        <ul className="space-y-1">
          {[
            { label: "Belum berangkat", dash: "6 5", width: 3 },
            { label: "Sedang berjalan", dash: "1 6", width: 3 },
            { label: "Rute selesai", dash: undefined, width: 2.5 },
          ].map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <svg width="26" height="6" aria-hidden className="shrink-0">
                <line
                  x1="1"
                  y1="3"
                  x2="25"
                  y2="3"
                  stroke="currentColor"
                  className="text-ink-muted"
                  strokeWidth={item.width}
                  strokeDasharray={item.dash}
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-[0.625rem] text-ink-muted">{item.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {selected && (
        <div className="absolute bottom-3 left-3 z-[400] min-w-[14rem] rounded-md border border-line bg-panel/95 px-3.5 py-2.5 shadow-pop">
          <p className="label text-2xs text-ink-muted">Armada terpilih</p>
          <p className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-ink">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
              style={{ background: fleetColor(selected.driver.slot, isDark) }}
              aria-hidden
            />
            {selected.driver.name}
          </p>
          <p className="text-xs text-ink-muted">
            {selected.driver.status} · menuju {selected.target?.pangkalan ?? "—"}
          </p>
        </div>
      )}
    </div>
  );
}
