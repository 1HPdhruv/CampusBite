import "server-only";
import { createHash } from "node:crypto";
import { getSupabase } from "../supabase";
import {
  cards,
  transactions,
  recharges,
  type Card,
  type Transaction,
  type Recharge,
} from "./fixtures";
import { ticketDraftSchema, type TicketDraft } from "../schemas";
import { signValue, verifyValue } from "../auth";
import { ApiError } from "./security";
export type Ticket = TicketDraft & {
  id: string;
  passenger_id: string;
  ticket_number: string;
  status: string;
  is_demo: true;
  created_at: string;
  idempotency_key: string;
  confirmation_hash: string;
};
// Intentionally process-local. Durable mode uses the atomic Supabase RPC.
const memory = globalThis as typeof globalThis & { metroTickets?: Ticket[] };
const tickets = (memory.metroTickets ??= []);
export function storageMode() {
  return process.env.METRO_STORAGE === "supabase" ? "supabase" : "memory";
}
async function ownRows<T>(
  table: string,
  actor: string,
  fixtures: T[],
): Promise<T[]> {
  if (storageMode() === "memory")
    return fixtures.filter(
      (row) => (row as { passenger_id: string }).passenger_id === actor,
    );
  const { data, error } = await getSupabase()
    .from(table)
    .select("*")
    .eq("passenger_id", actor)
    .limit(100)
    .abortSignal(AbortSignal.timeout(6000));
  if (error) throw new ApiError("DATABASE_UNAVAILABLE", 503);
  return data as T[];
}
export async function getCards(actor: string) {
  return ownRows<Card>("metro_smart_cards", actor, cards);
}
export async function requireCard(actor: string, id: string) {
  const card = (await getCards(actor)).find((c) => c.id === id);
  if (!card) throw new ApiError("CARD_NOT_FOUND", 404);
  return card;
}
export async function getTransactions(
  actor: string,
  cardId?: string,
  limit = 10,
) {
  if (cardId) await requireCard(actor, cardId);
  return (await ownRows<Transaction>("metro_transactions", actor, transactions))
    .filter((t) => !cardId || t.card_id === cardId)
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    .slice(0, Math.min(20, Math.max(1, limit)));
}
export async function getRecharges(actor: string, reference?: string) {
  return (await ownRows<Recharge>("metro_recharge_attempts", actor, recharges))
    .filter((r) => !reference || r.reference === reference)
    .slice(0, 10);
}
export async function getTickets(actor: string) {
  return (await ownRows<Ticket>("metro_support_tickets", actor, tickets))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 20);
}
export async function prepareTicket(actor: string, raw: unknown) {
  const draft = ticketDraftSchema.parse(raw);
  if (draft.cardId) await requireCard(actor, draft.cardId);
  return {
    draft,
    confirmation: await signValue(
      "ticket",
      { actor, draft, nonce: crypto.randomUUID() },
      600,
    ),
    expires_in: 600,
    notice: "In-app prototype ticket only; not submitted to CMRL",
  };
}
export async function createTicket(
  actor: string,
  confirmation: string,
  idempotencyKey: string,
) {
  const signed = await verifyValue<{
    actor: string;
    draft: TicketDraft;
    nonce: string;
  }>(confirmation, "ticket");
  if (!signed || signed.actor !== actor)
    throw new ApiError("CONFIRMATION_EXPIRED_OR_INVALID", 403);
  const draft = ticketDraftSchema.parse(signed.draft);
  if (draft.cardId) await requireCard(actor, draft.cardId);
  const hash = createHash("sha256").update(confirmation).digest("hex");
  if (storageMode() === "supabase") {
    const { data, error } = await getSupabase()
      .rpc("metro_create_ticket", {
        p_passenger: actor,
        p_card: draft.cardId ?? null,
        p_category: draft.category,
        p_description: draft.description,
        p_language: draft.language,
        p_key: idempotencyKey,
        p_confirmation: hash,
      })
      .abortSignal(AbortSignal.timeout(6000));
    if (error) throw new ApiError("TICKET_WRITE_UNAVAILABLE", 503);
    return data as Ticket;
  }
  const prior = tickets.find(
    (t) =>
      t.passenger_id === actor &&
      (t.idempotency_key === idempotencyKey || t.confirmation_hash === hash),
  );
  if (prior) {
    if (prior.confirmation_hash !== hash)
      throw new ApiError("IDEMPOTENCY_CONFLICT", 409);
    return prior;
  }
  const ticket: Ticket = {
    ...draft,
    id: crypto.randomUUID(),
    passenger_id: actor,
    ticket_number: `MS-DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    status: "open",
    is_demo: true,
    created_at: new Date().toISOString(),
    idempotency_key: idempotencyKey,
    confirmation_hash: hash,
  };
  tickets.push(ticket);
  return ticket;
}
export function publicTicket(t: Ticket) {
  const { confirmation_hash, idempotency_key, passenger_id, ...safe } = t;
  void confirmation_hash;
  void idempotency_key;
  void passenger_id;
  return safe;
}
