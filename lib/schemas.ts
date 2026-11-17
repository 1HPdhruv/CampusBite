import { dateSchema } from "./metro/fare-policy";
import { z } from "zod";
export const languageSchema = z.enum(["en-IN", "ta-IN", "auto"]);
export const cardIdSchema = z.string().uuid();
export const stationCodeSchema = z.string().regex(/^[A-Z][A-Z0-9_]{1,30}$/);
export const referenceSchema = z
  .string()
  .trim()
  .min(3)
  .max(80)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const chatMessageSchema = z
  .object({
    role: z.enum(["user", "model"]),
    text: z.string().trim().min(1).max(4000),
  })
  .strict();
export const agentRequestSchema = z
  .object({
    messages: z.array(chatMessageSchema).min(1).max(20),
    language: languageSchema.default("auto"),
  })
  .strict()
  .refine(
    (v) => v.messages.at(-1)?.role === "user",
    "Last message must be from user",
  );
export const transactionInputSchema = z
  .object({
    cardId: cardIdSchema.optional(),
    limit: z.number().int().min(1).max(20).default(10),
  })
  .strict();
export const fareInputSchema = z
  .object({
    from: stationCodeSchema,
    to: stationCodeSchema,
    asOf: dateSchema.optional(),
  })
  .strict();
export const ticketDraftSchema = z
  .object({
    category: z.enum(["recharge", "card", "travel", "other"]),
    description: z.string().trim().min(10).max(800),
    cardId: cardIdSchema.optional(),
    language: z.enum(["en-IN", "ta-IN"]),
  })
  .strict();
export const ticketCreateSchema = z
  .object({
    confirmation: z.string().min(10).max(3000),
    confirmed: z.literal(true),
    idempotencyKey: z.string().uuid(),
  })
  .strict();
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type Language = z.infer<typeof languageSchema>;
export type TicketDraft = z.infer<typeof ticketDraftSchema>;
