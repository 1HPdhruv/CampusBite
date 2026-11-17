import { z } from "zod";
import { cardIdSchema, stationCodeSchema, ticketDraftSchema } from "../schemas";
const statuses = z.enum(["pending", "success", "failed", "unknown"]);
export const cardResultSchema = z.object({
  id: cardIdSchema,
  kind: z.enum(["ncmc", "legacy_cmrl_stored_value", "qr_store_value_pass"]),
  masked_number: z.string().regex(/^•••• •••• [0-9]{4}$/),
  status: z.enum(["active", "inactive", "policy_example"]),
  balance: z.coerce.number().nonnegative(),
  is_demo: z.literal(true),
  issuer_note: z.string().max(300),
  updated_at: z.string().max(50),
});
export const transactionResultSchema = z.object({
  id: cardIdSchema,
  card_id: cardIdSchema,
  type: z.enum(["travel", "recharge"]),
  amount: z.coerce.number(),
  status: statuses,
  reference: z.string().max(80),
  description: z.string().max(200),
  occurred_at: z.string().max(50),
  is_demo: z.literal(true),
});
export const rechargeResultSchema = z.object({
  id: cardIdSchema,
  card_id: cardIdSchema,
  amount: z.coerce.number().positive(),
  reference: z.string().max(80),
  payment_status: statuses,
  card_update_status: statuses,
  created_at: z.string().max(50),
  is_demo: z.literal(true),
});
const officialUrl = z
  .string()
  .url()
  .startsWith("https://chennaimetrorail.org/");
const metadata = { source_url: officialUrl, verified_at: z.string().max(20) };
export const stationResultSchema = z.object({
  code: stationCodeSchema,
  name_en: z.string().max(150),
  name_ta: z.string().max(200).nullable(),
  corridor: z.string().max(50),
  operational: z.boolean().nullable(),
  line_ids: z.array(z.enum(["BLUE", "GREEN"])).optional(),
  interchanges: z
    .array(
      z.object({
        station_id: z.string(),
        from_stop: z.string(),
        to_stop: z.string(),
        source_url: officialUrl,
        verified_at: z.string(),
      }),
    )
    .optional(),
  routing_verified: z.literal(false).optional(),
  ...metadata,
});
export const fareResultSchema = z.union([
  z.object({
    verified: z.literal(true),
    as_of: z.string(),
    freshness: z.literal("within_local_review_window"),
    effective_date_known: z.boolean(),
    from: stationCodeSchema,
    to: stationCodeSchema,
    standard: z.number().nonnegative(),
    discounted: z.number().nonnegative(),
    discounted_source_url: officialUrl,
    effective_from: z.string().nullable(),
    source_version: z.string().max(100),
    ...metadata,
  }),
  z.object({
    verified: z.literal(false),
    reason: z.string(),
    as_of: z.string(),
    message: z.string().max(200),
    ...metadata,
  }),
]);
export const policyResultSchema = z.object({
  answer: z.string().max(1200),
  answer_ta: z.string().max(1800),
  source_date: z.string().max(20),
  ...metadata,
});
export const guidanceResultSchema = z.object({
  answer: z.string().max(1200),
  status: z.string().max(200),
  ...metadata,
});
export const ticketProposalResultSchema = z.object({
  draft: ticketDraftSchema,
  confirmation: z.string().max(3000),
  expires_in: z.number().int().positive(),
  notice: z.string().max(200),
});
export const ticketResultSchema = z.object({
  id: cardIdSchema,
  ticket_number: z.string().max(100),
  category: z.enum(["recharge", "card", "travel", "other"]),
  description: z.string().max(800),
  language: z.enum(["en-IN", "ta-IN"]),
  status: z.enum(["open", "reviewing", "closed"]),
  is_demo: z.literal(true),
  created_at: z.string().max(50),
});
