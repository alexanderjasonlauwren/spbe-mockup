export type Coord = [number, number];

/**
 * Snap a sequence of waypoints onto real roads via OSRM.
 *
 * `VITE_ROUTER_URL` defaults to empty, and empty means straight legs — not a
 * fallback for when something goes wrong, but the deliberate default. This
 * console ships on-premise (§7.2 of the solution document): a build with no
 * router configured must not go looking for one on the public internet. The
 * only router this ever called was OSRM's own demo instance, whose usage
 * policy forbids production traffic, so pointing at it by default was a
 * licensing problem as much as a connectivity one — and on an air-gapped
 * site it would just hang or fail per request.
 *
 * Failures fall back to the straight line for the same reason a missing
 * router does: a round with corners is still a round, and a blank map is a
 * worse answer than an imprecise one.
 */
export async function snapToRoads(waypoints: Coord[]): Promise<Coord[]> {
  if (waypoints.length < 2) return waypoints;

  const routerUrl = import.meta.env.VITE_ROUTER_URL?.trim();
  if (!routerUrl) return waypoints;

  try {
    const path = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(";");
    const response = await fetch(
      `${routerUrl.replace(/\/$/, "")}/route/v1/driving/${path}?overview=full&geometries=geojson`,
    );
    if (!response.ok) return waypoints;

    const data = (await response.json()) as {
      routes?: Array<{ geometry?: { coordinates?: number[][] } }>;
    };
    const coordinates = data.routes?.[0]?.geometry?.coordinates;
    if (!coordinates?.length) return waypoints;

    return coordinates.map(([lng, lat]) => [lat, lng] as Coord);
  } catch {
    return waypoints;
  }
}
