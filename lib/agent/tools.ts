import "server-only";
import { z } from "zod";
import { defineTool } from "./defineTool";
import {
  cardIdSchema,
  transactionInputSchema,
  fareInputSchema,
  stationCodeSchema,
  referenceSchema,
  ticketDraftSchema,
} from "../schemas";
import {
  getCards,
  requireCard,
  getTransactions,
  getRecharges,
  getTickets,
  prepareTicket,
  publicTicket,
} from "../metro/store";
import {
  searchStations,
  getStationInfo,
  getFare,
  lostCardPolicy,
  rechargeGuidance,
} from "../metro/official";
import {
  cardResultSchema,
  transactionResultSchema,
  rechargeResultSchema,
  stationResultSchema,
  fareResultSchema,
  policyResultSchema,
  guidanceResultSchema,
  ticketProposalResultSchema,
  ticketResultSchema,
} from "../metro/results";
export function toolsFor(actor: string) {
  const empty = z.object({}).strict();
  return [
    defineTool({
      name: "getMyCards",
      resultSchema: z.object({
        cards: z.array(cardResultSchema).max(20),
        is_demo: z.literal(true),
      }),
      description: "List this signed-in demo passenger's simulated cards only.",
      schema: empty,
      run: async () => ({ cards: await getCards(actor), is_demo: true }),
    }),
    defineTool({
      name: "getCardBalance",
      resultSchema: z.object({
        card: cardResultSchema,
        is_demo: z.literal(true),
      }),
      description:
        "Read simulated balance of an owned card, never a live CMRL balance.",
      schema: z.object({ cardId: cardIdSchema }).strict(),
      run: async ({ cardId }) => ({
        card: await requireCard(actor, cardId),
        is_demo: true,
      }),
    }),
    defineTool({
      name: "getRecentTransactions",
      resultSchema: z.object({
        transactions: z.array(transactionResultSchema).max(20),
        is_demo: z.literal(true),
      }),
      description:
        "Read bounded demo travel/recharge transactions for current passenger.",
      schema: transactionInputSchema,
      run: async ({ cardId, limit }) => ({
        transactions: await getTransactions(actor, cardId, limit),
        is_demo: true,
      }),
    }),
    defineTool({
      name: "checkRechargeStatus",
      resultSchema: z.object({
        attempts: z.array(rechargeResultSchema).max(10),
        is_demo: z.literal(true),
      }),
      description:
        "Read simulated recharge attempts; payment and card-update states differ. Empty result means no match.",
      schema: z.object({ reference: referenceSchema.optional() }).strict(),
      run: async ({ reference }) => ({
        attempts: await getRecharges(actor, reference),
        is_demo: true,
      }),
    }),
    defineTool({
      name: "getRechargeGuidance",
      resultSchema: guidanceResultSchema,
      description:
        "Read source-qualified official recharge guidance. Does not take payment.",
      schema: empty,
      run: async () => rechargeGuidance(),
    }),
    defineTool({
      name: "searchStations",
      resultSchema: z.object({
        stations: z.array(stationResultSchema).max(10),
        coverage: z.literal("partial"),
      }),
      description:
        "Search checked subset of English/Tamil official station names. This is not the full network.",
      schema: z.object({ query: z.string().trim().min(1).max(80) }).strict(),
      run: async ({ query }) => ({
        stations: searchStations(query),
        coverage: "partial",
      }),
    }),
    defineTool({
      name: "getStationInfo",
      resultSchema: z.object({ station: stationResultSchema.nullable() }),
      description:
        "Read checked station record by station code, without guessing routes or current operation.",
      schema: z.object({ code: stationCodeSchema }).strict(),
      run: async ({ code }) => ({
        station: getStationInfo(code),
      }),
    }),
    defineTool({
      name: "getFare",
      resultSchema: fareResultSchema,
      description:
        "Return only checked dated fare records. Missing, stale, historical-before-verification or future fares must be reported as unverified. asOf is an optional YYYY-MM-DD date.",
      schema: fareInputSchema,
      run: async ({ from, to, asOf }) => getFare(from, to, asOf),
    }),
    defineTool({
      name: "getLostCardPolicy",
      resultSchema: policyResultSchema,
      description:
        "Read CMRL notice on no transfer/refund and inability to block lost NCMC offline wallet funds.",
      schema: empty,
      run: async () => lostCardPolicy(),
    }),
    defineTool({
      name: "getMySupportTickets",
      resultSchema: z.object({
        tickets: z.array(ticketResultSchema).max(20),
        is_demo: z.literal(true),
      }),
      description:
        "Read only this passenger's prototype support tickets. Never CMRL complaints.",
      schema: empty,
      run: async () => ({
        tickets: (await getTickets(actor)).map(publicTicket),
        is_demo: true,
      }),
    }),
    defineTool({
      name: "prepareSupportTicket",
      resultSchema: ticketProposalResultSchema,
      description:
        "Prepare an in-app ticket summary for visible UI confirmation. This tool NEVER creates a ticket. User must review and confirm separately.",
      schema: ticketDraftSchema,
      run: async (draft) => prepareTicket(actor, draft),
    }),
  ];
}
