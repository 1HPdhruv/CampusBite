import type { Session, FunctionResponse } from "@google/genai";
import { LiveEvents } from "./live-events";
import { PcmEncoder, decodePcm } from "./pcm";
import { withinDeadline } from "../agent/deadline";
export type LiveOptions = {
  language: string;
  caption: (role: "user" | "model", text: string, final: boolean) => void;
  state: (state: "connecting" | "listening" | "stopped") => void;
  failure: () => void;
};
export class LiveVoiceClient {
  private generation = 0;
  private session: Session | null = null;
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private worklet: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private gain: GainNode | null = null;
  private abort: AbortController | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private events: LiveEvents | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private nextAt = 0;
  constructor(private options: LiveOptions) {}
  stop() {
    this.generation++;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.abort?.abort();
    this.abort = null;
    this.events?.close();
    this.events = null;
    const session = this.session;
    this.session = null;
    try {
      session?.close();
    } catch {}
    this.worklet?.disconnect();
    if (this.worklet) this.worklet.port.onmessage = null;
    this.worklet = null;
    this.source?.disconnect();
    this.source = null;
    this.gain?.disconnect();
    this.gain = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.clearAudio();
    const context = this.context;
    this.context = null;
    if (context) void context.close().catch(() => {});
    this.options.state("stopped");
  }
  private fail(run: number) {
    if (this.generation !== run) return;
    this.stop();
    this.options.failure();
  }
  private clearAudio() {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {}
      source.disconnect();
    }
    this.sources.clear();
    this.nextAt = 0;
  }
  private play(data: string, mime: string) {
    const ctx = this.context;
    if (!ctx || !/^audio\/pcm(?:;|$)/.test(mime)) return;
    const samples = decodePcm(data),
      rate = Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000);
    if (rate < 8000 || rate > 48000 || !samples.length) return;
    if (this.nextAt - ctx.currentTime > 5) {
      this.clearAudio();
      return;
    }
    const buffer = ctx.createBuffer(1, samples.length, rate);
    buffer.copyToChannel(samples, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
    };
    this.nextAt = Math.max(this.nextAt, ctx.currentTime);
    source.start(this.nextAt);
    this.nextAt += buffer.duration;
  }
  async start() {
    this.stop();
    const run = this.generation;
    this.options.state("connecting");
    const controller = new AbortController();
    this.abort = controller;
    this.timer = setTimeout(() => this.stop(), 45000);
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof AudioContext === "undefined"
      )
        throw new Error("Voice unavailable");
      this.context = new AudioContext();
      await this.context.resume();
      if (run !== this.generation) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: false,
      });
      if (run !== this.generation) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      const credential = await fetch("/api/voice/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: this.options.language }),
        signal: controller.signal,
      });
      if (!credential.ok) throw new Error("Voice unavailable");
      const auth = (await credential.json()) as {
        token: string;
        model: string;
        capability: string;
      };
      if (run !== this.generation) return;
      const { GoogleGenAI, Modality } = await import("@google/genai");
      if (run !== this.generation) return;
      const ai = new GoogleGenAI({
        apiKey: auth.token,
        httpOptions: { apiVersion: "v1beta" },
      });
      const events = new LiveEvents({
        caption: this.options.caption,
        interrupt: () => this.clearAudio(),
        audio: (data, mime) => this.play(data, mime),
        failure: () => this.fail(run),
        respond: (responses) => {
          if (run === this.generation && responses.length)
            this.session?.sendToolResponse({ functionResponses: responses });
        },
        tools: async (calls) => {
          const r = await fetch("/api/voice/tools", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ capability: auth.capability, calls }),
            signal: controller.signal,
          });
          if (!r.ok) throw new Error("Tool unavailable");
          return ((await r.json()) as { functionResponses: FunctionResponse[] })
            .functionResponses;
        },
      });
      this.events = events;
      const connection = ai.live.connect({
        model: auth.model,
        config: { responseModalities: [Modality.AUDIO] },
        callbacks: {
          onmessage: (message) => {
            if (run === this.generation)
              void events.handle(message).catch(() => this.fail(run));
          },
          onerror: () => this.fail(run),
          onclose: () => this.fail(run),
        },
      });
      // A late connection after stop is closed, never allowed to revive a microphone session.
      void connection.then(
        (s) => {
          if (run !== this.generation) s.close();
        },
        () => {},
      );
      const connectionDeadline = AbortSignal.any([
        controller.signal,
        AbortSignal.timeout(12000),
      ]);
      const session = await withinDeadline(connection, connectionDeadline);
      if (run !== this.generation) {
        session.close();
        return;
      }
      this.session = session;
      const ctx = this.context!;
      await ctx.audioWorklet.addModule("/metro-pcm-worklet.js");
      if (run !== this.generation) return;
      this.worklet = new AudioWorkletNode(ctx, "metro-capture");
      this.source = ctx.createMediaStreamSource(stream);
      this.gain = ctx.createGain();
      this.gain.gain.value = 0;
      const encoder = new PcmEncoder(ctx.sampleRate);
      this.worklet.port.onmessage = (e: MessageEvent<Float32Array>) => {
        if (run === this.generation) {
          try {
            const data = encoder.encode(e.data);
            if (data)
              this.session?.sendRealtimeInput({
                audio: { data, mimeType: "audio/pcm;rate=16000" },
              });
          } catch {
            this.fail(run);
          }
        }
      };
      this.source.connect(this.worklet);
      this.worklet.connect(this.gain);
      this.gain.connect(ctx.destination);
      this.options.state("listening");
    } catch {
      this.fail(run);
    }
  }
}
