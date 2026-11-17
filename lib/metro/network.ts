import { z } from "zod";
// Independently implemented Zod model. OpenMetro schema separation was a design reference;
// no MPL-covered schema/source file is copied. Unknown service status never means operating.
const source = z.object({
  source_url: z.string().url(),
  verified_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export const canonicalStationSchema = source.extend({
  code: z.string().regex(/^[A-Z][A-Z0-9_]+$/),
  name_en: z.string().min(1).max(150),
  name_ta: z.string().max(200).nullable(),
  line_ids: z.array(z.enum(["BLUE", "GREEN"])).min(1),
  operational: z.boolean().nullable(),
});
export const lineSchema = source.extend({
  id: z.enum(["BLUE", "GREEN"]),
  name: z.string().max(50),
  operational: z.boolean().nullable(),
});
export const stopSchema = z.object({
  id: z.string().max(80),
  station_id: z.string(),
  line_id: z.enum(["BLUE", "GREEN"]),
});
export const transferSchema = source.extend({
  station_id: z.string(),
  from_stop: z.string(),
  to_stop: z.string(),
});
export const networkSchema = z
  .object({
    stations: z.array(canonicalStationSchema),
    lines: z.array(lineSchema),
    stops: z.array(stopSchema),
    transfers: z.array(transferSchema),
  })
  .superRefine((n, ctx) => {
    const unique = (items: string[], name: string) => {
      if (new Set(items).size !== items.length)
        ctx.addIssue({ code: "custom", message: `Duplicate ${name}` });
    };
    unique(
      n.stations.map((s) => s.code),
      "station",
    );
    unique(
      n.lines.map((l) => l.id),
      "line",
    );
    unique(
      n.stops.map((s) => s.id),
      "stop",
    );
    for (const stop of n.stops) {
      const station = n.stations.find((s) => s.code === stop.station_id);
      if (
        !station?.line_ids.includes(stop.line_id) ||
        !n.lines.some((l) => l.id === stop.line_id)
      )
        ctx.addIssue({ code: "custom", message: "Dangling stop reference" });
    }
    for (const station of n.stations)
      for (const line of station.line_ids)
        if (
          !n.stops.some(
            (stop) => stop.station_id === station.code && stop.line_id === line,
          )
        )
          ctx.addIssue({
            code: "custom",
            message: "Missing station-line stop",
          });
    for (const transfer of n.transfers) {
      const a = n.stops.find((s) => s.id === transfer.from_stop),
        b = n.stops.find((s) => s.id === transfer.to_stop);
      if (
        !a ||
        !b ||
        a.station_id !== transfer.station_id ||
        b.station_id !== transfer.station_id ||
        a.line_id === b.line_id
      )
        ctx.addIssue({ code: "custom", message: "Invalid transfer" });
    }
  });
export type Network = z.infer<typeof networkSchema>;
export const MAP_URL =
  "https://chennaimetrorail.org/wp-content/uploads/2024/06/Phase-1-With-Extension-Map-new.pdf";
export function makeNetwork(
  stations: z.infer<typeof canonicalStationSchema>[],
): Network {
  const metadata = { source_url: MAP_URL, verified_at: "2026-11-11" };
  const lines = [
    { id: "BLUE" as const, name: "Blue Line", operational: null, ...metadata },
    {
      id: "GREEN" as const,
      name: "Green Line",
      operational: null,
      ...metadata,
    },
  ];
  const stops = stations.flatMap((s) =>
    s.line_ids.map((line_id) => ({
      id: `${s.code}:${line_id}`,
      station_id: s.code,
      line_id,
    })),
  );
  // Explicitly checked map memberships only; never infer transfers from station proximity.
  const transfers = ["ALANDUR", "CENTRAL"]
    .filter((code) =>
      stations.some((s) => s.code === code && s.line_ids.length === 2),
    )
    .flatMap((station_id) => [
      {
        station_id,
        from_stop: `${station_id}:BLUE`,
        to_stop: `${station_id}:GREEN`,
        ...metadata,
      },
      {
        station_id,
        from_stop: `${station_id}:GREEN`,
        to_stop: `${station_id}:BLUE`,
        ...metadata,
      },
    ]);
  return networkSchema.parse({ stations, lines, stops, transfers });
}
export function stationInterchanges(network: Network, code: string) {
  return network.transfers.filter((t) => t.station_id === code);
}
