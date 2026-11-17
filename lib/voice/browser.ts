import { normalizeForSpeech } from "./pronunciation";
export type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};
export function recognitionConstructor(): (new () => Recognition) | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as typeof window & {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}
export function voiceErrorKey(code: string) {
  return code === "not-allowed" || code === "service-not-allowed"
    ? "denied"
    : "voiceError";
}
export function speak(
  text: string,
  language: string,
  onEnd: () => void,
): "ok" | "unsupported" | "noTamil" {
  if (!("speechSynthesis" in window)) return "unsupported";
  const voices = speechSynthesis.getVoices();
  const voice =
    voices.find((v) => v.lang.toLowerCase() === language.toLowerCase()) ??
    voices.find((v) => v.lang.startsWith(language.slice(0, 2)));
  if (language === "ta-IN" && !voice) return "noTamil";
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(normalizeForSpeech(text, language));
  u.lang = language;
  if (voice) u.voice = voice;
  u.onend = onEnd;
  u.onerror = onEnd;
  speechSynthesis.speak(u);
  return "ok";
}
