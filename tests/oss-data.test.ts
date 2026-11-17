import { it, expect, describe } from "vitest";
import {
  searchStations,
  getStationInfo,
  network,
  fares,
  getFare,
} from "../lib/metro/official";
import { networkSchema, stationInterchanges } from "../lib/metro/network";
import { lookupFare, fareRecordSchema } from "../lib/metro/fare-policy";
import { normalizeForSpeech } from "../lib/voice/pronunciation";
import { detectLanguage } from "../lib/language";
describe("canonical Chennai subset", () => {
  it("finds checked English/Tamil records, never fabricates Yellow Line records", () => {
    expect(searchStations("கிண்டி")[0].code).toBe("GUINDY");
    expect(searchStations("Alandur")[0].code).toBe("ALANDUR");
    expect(searchStations("Central")[0].code).toBe("CENTRAL");
    expect(searchStations("Yellow")).toEqual([]);
    expect(network.lines.map((l) => l.id)).toEqual(["BLUE", "GREEN"]);
  });
  it("represents two directions at a checked interchange without inventing routes", () => {
    expect(getStationInfo("ALANDUR")).toMatchObject({
      line_ids: ["BLUE", "GREEN"],
      routing_verified: false,
      operational: null,
    });
    expect(stationInterchanges(network, "ALANDUR")).toHaveLength(2);
    expect(stationInterchanges(network, "GUINDY")).toHaveLength(0);
    expect(getStationInfo("FAKE_STATION")).toBeNull();
  });
  it("rejects dangling stops, duplicate identities and cross-station transfers", () => {
    expect(
      networkSchema.safeParse({
        ...network,
        stops: [
          ...network.stops,
          { id: "bad", station_id: "MISSING", line_id: "BLUE" },
        ],
      }).success,
    ).toBe(false);
    expect(
      networkSchema.safeParse({
        ...network,
        stations: [...network.stations, network.stations[0]],
      }).success,
    ).toBe(false);
    expect(
      networkSchema.safeParse({
        ...network,
        transfers: [
          {
            station_id: "ALANDUR",
            from_stop: "AIRPORT:BLUE",
            to_stop: "EGMORE:GREEN",
            source_url: network.lines[0].source_url,
            verified_at: "2026-11-11",
          },
        ],
      }).success,
    ).toBe(false);
  });
});
describe("fare evidence and expiry", () => {
  it("keeps independently sourced prices with date and version", () => {
    const r = lookupFare(
      fares,
      "AIRPORT",
      "MEENAMBAKKAM",
      "2026-11-11",
      "2026-11-11",
    );
    expect(r).toMatchObject({
      verified: true,
      standard: 10,
      discounted: 8,
      source_version: "cmrl-2026-10-retrieved-2026-11-11",
      effective_date_known: false,
    });
    expect(r.source_url).toContain("chennaimetrorail.org");
  });
  it("abstains for unknown, stale, future, invalid and unsupported historical dates", () => {
    for (const [from, to, date, today, reason] of [
      ["EGMORE", "GUINDY", "2026-11-11", "2026-11-11", "unknown_pair"],
      [
        "AIRPORT",
        "GUINDY",
        "2026-12-12",
        "2026-12-12",
        "stale_or_outside_validity",
      ],
      ["AIRPORT", "GUINDY", "2026-11-12", "2026-11-11", "future_date"],
      [
        "AIRPORT",
        "GUINDY",
        "2026-11-10",
        "2026-11-11",
        "stale_or_outside_validity",
      ],
      ["AIRPORT", "GUINDY", "2026-02-30", "2026-11-11", "invalid_date"],
    ]) {
      const r = lookupFare(fares, from, to, date, today);
      expect(r).toMatchObject({ verified: false, reason });
      expect(r).not.toHaveProperty("standard");
    }
  });
  it("honours explicit validity boundaries and rejects non-official fare provenance", () => {
    const r = {
      ...fares[0],
      effective_from: "2026-11-12",
      effective_to: "2026-11-15",
    };
    expect(
      lookupFare([r], r.from, r.to, "2026-11-11", "2026-11-16").verified,
    ).toBe(false);
    expect(
      lookupFare([r], r.from, r.to, "2026-11-16", "2026-11-16").verified,
    ).toBe(false);
    expect(
      fareRecordSchema.safeParse({
        ...r,
        source_url: "https://example.com/untrusted",
      }).success,
    ).toBe(false);
  });
});
it("normalizes only speech text and retains amounts and verified station spelling", () => {
  const text = "CMRL NCMC Airport ₹1,234.50";
  const ta = normalizeForSpeech(text, "ta-IN");
  expect(ta).toContain("விமான நிலையம்");
  expect(ta).toContain("1,234.50 ரூபாய்");
  expect(ta).toContain("என் சி எம் சி");
  expect(text).toBe("CMRL NCMC Airport ₹1,234.50");
  expect(normalizeForSpeech("₹30 NCMC", "en-IN")).toBe("30 rupees N C M C");
  expect(detectLanguage("enoda recharge aagala")).toBe("ta-IN");
});
