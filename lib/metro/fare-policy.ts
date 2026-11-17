import { z } from "zod";
import { todayInIndia } from "../dates";
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      Number.isFinite(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s,
    "Invalid calendar date",
  );
export const fareRecordSchema = z
  .object({
    from: z.string(),
    to: z.string(),
    standard: z.number().nonnegative(),
    discounted: z.number().nonnegative(),
    source_url: z.string().url().startsWith("https://chennaimetrorail.org/"),
    discounted_source_url: z
      .string()
      .url()
      .startsWith("https://chennaimetrorail.org/"),
    verified_at: dateSchema,
    effective_from: dateSchema.nullable(),
    effective_to: dateSchema.nullable().default(null),
    source_version: z.string().min(1),
    max_age_days: z.number().int().min(1).max(90).default(30),
  })
  .superRefine((r, ctx) => {
    if (r.effective_from && r.effective_to && r.effective_to < r.effective_from)
      ctx.addIssue({ code: "custom", message: "Reversed fare validity" });
  });
export type FareRecord = z.infer<typeof fareRecordSchema>;
export const FARE_FALLBACK_URL =
  "https://chennaimetrorail.org/cmrl-fare-table/";
export function fareAbstention(reason: string, asOf: string) {
  return {
    verified: false as const,
    reason,
    as_of: asOf,
    message: "Fare not verified — check the official CMRL fare table",
    source_url: FARE_FALLBACK_URL,
    verified_at: "2026-11-11",
  };
}
export function lookupFare(
  records: FareRecord[],
  from: string,
  to: string,
  asOf = todayInIndia(),
  today = todayInIndia(),
) {
  if (!dateSchema.safeParse(asOf).success)
    return fareAbstention("invalid_date", asOf);
  if (asOf > today) return fareAbstention("future_date", asOf);
  const matches = records
    .filter((r) => r.from === from && r.to === to)
    .sort((a, b) => b.verified_at.localeCompare(a.verified_at));
  if (!matches.length) return fareAbstention("unknown_pair", asOf);
  for (const raw of matches) {
    const parsed = fareRecordSchema.safeParse(raw);
    if (!parsed.success) continue;
    const r = parsed.data;
    if (
      r.verified_at > asOf ||
      (r.effective_from && r.effective_from > asOf) ||
      (r.effective_to && r.effective_to < asOf)
    )
      continue;
    const age = (Date.parse(asOf) - Date.parse(r.verified_at)) / 86400000;
    if (age > r.max_age_days) continue;
    return {
      ...r,
      verified: true as const,
      as_of: asOf,
      age_days: age,
      freshness: "within_local_review_window" as const,
      effective_date_known: r.effective_from !== null,
    };
  }
  return fareAbstention("stale_or_outside_validity", asOf);
}
