import type { Language, ChatMessage } from "./schemas";
export function detectLanguage(text: string): "ta-IN" | "en-IN" {
  return /[\u0B80-\u0BFF]/.test(text) ||
    /\b(enoda|ennoda|panam|irukku|recharge aachu|enna|evlo|venum|pannunga|aagala)\b/i.test(
      text,
    )
    ? "ta-IN"
    : "en-IN";
}
export function responseLanguage(language: Language, messages: ChatMessage[]) {
  return language === "auto"
    ? detectLanguage(
        messages.filter((m) => m.role === "user").at(-1)?.text ?? "",
      )
    : language;
}
