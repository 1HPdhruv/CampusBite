// Adapted event-bridge organization from voice-agent-oss (MIT), revision
// d34a00a8138bb427f0f08c99ae19453ec768a489, apps/agent/src/services/gemini-live.ts.
// Copyright (c) 2026 AUTMA LLC. See third_party/voice-agent-oss.LICENSE.
// Browser PCM, bounded delta/cumulative captions, every audio part, cancelled tool calls,
// server validation and ephemeral credentials replace telephony/persisted transcripts.
import type { LiveServerMessage, FunctionResponse } from "@google/genai";
export type LiveCallbacks = {
  caption: (role: "user" | "model", text: string, final: boolean) => void;
  audio: (data: string, mime: string) => void;
  interrupt: () => void;
  tools: (
    calls: { id: string; name: string; args: Record<string, unknown> }[],
  ) => Promise<FunctionResponse[]>;
  respond: (responses: FunctionResponse[]) => void;
  failure: () => void;
};
export function mergeCaption(current: string, incoming: string) {
  if (incoming.startsWith(current)) return incoming.slice(0, 4000);
  if (current.endsWith(incoming)) return current;
  return `${current} ${incoming}`.trim().slice(0, 4000);
}
export class LiveEvents {
  private input = "";
  private output = "";
  private cancelled = new Set<string>();
  private calls = 0;
  private closed = false;
  constructor(private callbacks: LiveCallbacks) {}
  close() {
    this.closed = true;
    this.input = "";
    this.output = "";
    this.cancelled.clear();
  }
  async handle(message: LiveServerMessage) {
    if (this.closed) return;
    for (const id of message.toolCallCancellation?.ids ?? [])
      this.cancelled.add(id);
    const content = message.serverContent;
    if (content?.interrupted) {
      this.output = "";
      this.callbacks.interrupt();
    }
    const inText = content?.inputTranscription?.text;
    if (inText) {
      this.input = mergeCaption(this.input, inText);
      this.callbacks.caption("user", this.input, false);
    }
    if (content?.inputTranscription?.finished && this.input) {
      this.callbacks.caption("user", this.input, true);
      this.input = "";
    }
    const outText = content?.outputTranscription?.text;
    if (outText && !content?.interrupted) {
      this.output = mergeCaption(this.output, outText);
      this.callbacks.caption("model", this.output, false);
    }
    if (
      (content?.outputTranscription?.finished || content?.turnComplete) &&
      this.output
    ) {
      this.callbacks.caption("model", this.output, true);
      this.output = "";
    }
    for (const part of content?.modelTurn?.parts ?? [])
      if (part.inlineData?.data && !content?.interrupted)
        this.callbacks.audio(
          part.inlineData.data,
          part.inlineData.mimeType ?? "audio/pcm;rate=24000",
        );
    const calls = message.toolCall?.functionCalls ?? [];
    if (calls.length) {
      this.calls += calls.length;
      if (this.calls > 12 || calls.length > 4) {
        this.callbacks.failure();
        return;
      }
      try {
        const responses = await this.callbacks.tools(
          calls.map((c) => ({
            id: c.id ?? "",
            name: c.name ?? "",
            args: c.args ?? {},
          })),
        );
        if (!this.closed)
          this.callbacks.respond(
            responses.filter((r) => !this.cancelled.has(r.id ?? "")),
          );
      } catch {
        if (!this.closed) this.callbacks.failure();
      }
    }
  }
}
