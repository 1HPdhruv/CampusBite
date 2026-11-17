import type { TicketDraft } from "../schemas";
export type AgentStep = { tool: string; ok: boolean };
export type TicketProposal = {
  draft: TicketDraft;
  confirmation: string;
  expires_in: number;
  notice: string;
};
export type AgentResult = {
  correlation_id?: string;
  error_code?:
    "AI_QUOTA" | "AI_TIMEOUT" | "AI_CONFIGURATION" | "AI_UNAVAILABLE";
  reply: string;
  steps: AgentStep[];
  proposal?: TicketProposal;
};
