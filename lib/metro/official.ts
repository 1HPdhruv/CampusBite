import { makeNetwork, stationInterchanges } from "./network";
import { fareRecordSchema, lookupFare } from "./fare-policy";
// Small source-checked subset; no inferred fares or route instructions.
export const VERIFIED_AT = "2026-11-11";
export const FARE_URL = "https://chennaimetrorail.org/cmrl-fare-table/";
export const STANDARD_URL =
  "https://chennaimetrorail.org/wp-content/uploads/2026/10/Fare-Table.pdf";
export const DISCOUNT_URL =
  "https://chennaimetrorail.org/wp-content/uploads/2026/10/20-discounted-Fare.pdf";
export const LOST_URL =
  "https://chennaimetrorail.org/wp-content/uploads/2026/01/Press-Release-07.01.2026-English.pdf";
export const CONTACT_URL = "https://chennaimetrorail.org/contact-us/";
export const RECHARGE_URL = "https://chennaimetrorail.org/technology/it-afc/";
export const stations = [
  {
    code: "AIRPORT",
    name_en: "Airport",
    name_ta: "விமான நிலையம்",
    corridor: "Blue",
  },
  {
    code: "MEENAMBAKKAM",
    name_en: "Meenambakkam",
    name_ta: "மீனம்பாக்கம்",
    corridor: "Blue",
  },
  { code: "GUINDY", name_en: "Guindy", name_ta: "கிண்டி", corridor: "Blue" },
  { code: "NANDANAM", name_en: "Nandanam", name_ta: "நந்தனம்", corridor: "Blue" },
  { code: "EGMORE", name_en: "Egmore", name_ta: "எழும்பூர்", corridor: "Green" },
  {
    code: "ALANDUR",
    name_en: "Arignar Anna Alandur Metro",
    name_ta: null,
    corridor: "Blue / Green",
  },
  {
    code: "CENTRAL",
    name_en: "Puratchi Thalaivar Dr.M.G.Ramachandran Central Metro",
    name_ta: null,
    corridor: "Blue / Green",
  },
].map((s) => ({
  ...s,
  source_url: STANDARD_URL,
  verified_at: VERIFIED_AT,
  operational: null,
  line_ids: (s.corridor === "Blue / Green"
    ? ["BLUE", "GREEN"]
    : s.corridor === "Blue"
      ? ["BLUE"]
      : ["GREEN"]) as ("BLUE" | "GREEN")[],
}));
export const fares = [
  { from: "AIRPORT", to: "MEENAMBAKKAM", standard: 10, discounted: 8 },
  { from: "MEENAMBAKKAM", to: "AIRPORT", standard: 10, discounted: 8 },
  { from: "AIRPORT", to: "GUINDY", standard: 30, discounted: 24 },
  { from: "GUINDY", to: "AIRPORT", standard: 30, discounted: 24 },
]
  .map((f) => ({
    ...f,
    source_url: STANDARD_URL,
    discounted_source_url: DISCOUNT_URL,
    verified_at: VERIFIED_AT,
    effective_from: null,
    effective_to: null,
    max_age_days: 30,
    source_version: "cmrl-2026-10-retrieved-2026-11-11",
  }))
  .map((r) => fareRecordSchema.parse(r));
export const network = makeNetwork(stations);
export function getStationInfo(code: string) {
  const station = stations.find((s) => s.code === code);
  return station
    ? {
        ...station,
        interchanges: stationInterchanges(network, code),
        routing_verified: false,
      }
    : null;
}
export function searchStations(query: string) {
  const q = query.normalize("NFC").trim().toLocaleLowerCase();
  return stations
    .filter((s) =>
      [s.name_en, s.name_ta, s.code].some((n) =>
        n?.normalize("NFC").toLocaleLowerCase().includes(q),
      ),
    )
    .slice(0, 10);
}
export function getFare(from: string, to: string, asOf?: string) {
  return lookupFare(fares, from, to, asOf);
}
export function lostCardPolicy() {
  return {
    answer:
      "CMRL's 7 January 2026 notice says lost stored-value and Singara Chennai NCMC balances cannot be transferred or refunded. Lost NCMC offline-wallet funds cannot be blocked. This prototype cannot block any card.",
    answer_ta:
      "CMRL 7 ஜனவரி 2026 அறிவிப்பின்படி, தொலைந்த பயண அட்டை மற்றும் Singara Chennai NCMC இருப்பை மாற்றவோ திரும்பப் பெறவோ முடியாது. தொலைந்த NCMC ஆஃப்லைன் வாலட்டை முடக்க முடியாது. இந்த மாதிரி செயலியால் அட்டையை முடக்க முடியாது.",
    source_url: LOST_URL,
    source_date: "2026-01-07",
    verified_at: VERIFIED_AT,
  };
}
export function rechargeGuidance() {
  return {
    answer:
      "CMRL's IT/AFC page lists station counters, Yono and the SBI customer portal for NCMC top-ups; legacy travel-card channels are described separately. The page includes 2024-era information, so confirm current eligibility with the station or issuer. No payment is taken here.",
    source_url: RECHARGE_URL,
    verified_at: VERIFIED_AT,
    status:
      "partial: current card-specific eligibility not independently verified",
  };
}
